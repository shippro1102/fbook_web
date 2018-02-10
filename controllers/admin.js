var express = require('express');
var router = express.Router();
var request = require('request');
var util = require('util');
var async = require('async');
var objectHeaders = require('../helpers/headers');
var localSession = require('../middlewares/localSession');
var authorize = require('../middlewares/authorize');
var helper = require('../helpers/helpers');

router.get('/', authorize.isAdmin, function (req, res, next) {
    async.parallel({
        totalUser: (callback) => {
            request({
                url: req.configs.api_base_url + 'admin/count/users',
                headers: objectHeaders.headers({'Authorization': req.session.access_token})
            }, function (error, response, body) {
                if (!error && response.statusCode === 200) {
                    try {
                        var users = JSON.parse(body);
                        callback(null, users);
                    } catch (errorJSONParse) {
                        callback(null, null);
                    }
                } else {
                    callback(null, null);
                }
            });
        },
        totalBookHaveOwner: (callback) => {
            request({
                url: req.configs.api_base_url + 'admin/count/books/have-owner',
                headers: objectHeaders.headers({'Authorization': req.session.access_token})
            }, function (error, response, body) {
                if (!error && response.statusCode === 200) {
                    try {
                        var bookHaveOwner = JSON.parse(body);
                        callback(null, bookHaveOwner);
                    } catch (errorJSONParse) {
                        callback(null, null);
                    }
                } else {
                    callback(null, 0);
                }
            });
        },
        totalBook: (callback) => {
            request({
                url: req.configs.api_base_url + 'admin/count/books',
                headers: objectHeaders.headers({'Authorization': req.session.access_token})
            }, function (error, response, body) {
                if (!error && response.statusCode === 200) {
                    try {
                        var countAllBook = JSON.parse(body);
                        callback(null, countAllBook);
                    } catch (errorJSONParse) {
                        callback(null, null);
                    }
                } else {
                    callback(null, 0);
                }
            });
        },
        totalUserHaveBook: (callback) => {
            request({
                url: req.configs.api_base_url + 'admin/count/owners/have-book',
                headers: objectHeaders.headers({'Authorization': req.session.access_token})
            }, function (error, response, body) {
                if (!error && response.statusCode === 200) {
                    try {
                        var userHaveBook = JSON.parse(body);
                        callback(null, userHaveBook);
                    } catch (errorJSONParse) {
                        callback(null, null);
                    }
                } else {
                    callback(null, null);
                }
            });
        }
    }, (error, result) => {
        if (error) {
            req.flash('error', 'Sorry, something went wrong');
            return res.redirect('/');
        } else {
            res.render('admin/dashboard', {
                layout: 'admin/layout/admin_template',
                totalUser: result.totalUser.item,
                totalBookHaveOwner: result.totalBookHaveOwner.item,
                totalUserHaveBook: result.totalUserHaveBook.item,
                totalBook: result.totalBook.item,
                pageTitle: 'Admin Dashboard',
                info: req.flash('info'),
                error: req.flash('error'),
                activeDasboard: true,
            });
        }
    });
});

router.get('/waiting-request-edit-book', authorize.isAdmin, function (req, res, next) {
    var page = req.query.page ? req.query.page : 1;
    request({
        url: req.configs.api_base_url + 'admin/waiting-update-book' + '/?page=' + page,
        headers: objectHeaders.headers({'Authorization': req.session.access_token})
    }, function (error, response, body) {
        if (!error && response.statusCode === 200) {
            try {
                var data = JSON.parse(body);
                var pagination = helper.paginate({
                        total_record: data.item.total,
                        current_page: page,
                        link: `${req.configs.web_domain}:${req.configs.port}/admin/waiting-request-edit-book?page={?}`
                    });
                res.render('admin/waiting_request_edit_book', {
                    layout: 'admin/layout/admin_template',
                    dataRequest: data,
                    paginate: pagination,
                    pageTitle: 'Waiting Request Edit Book',
                    info: req.flash('info'),
                    error: req.flash('error'),
                    activeRequest: true,
                });
            } catch (errorJSONParse) {
                req.flash('error', 'Unknown error');
                return res.redirect('/admin');
            }
        } else {
            req.flash('error', 'Sorry, something went wrong');
            return res.redirect('/admin');
        }
    });
});

router.post('/approve-update-request/:id', authorize.isAdmin, function (req, res, next) {
    request.post({
        url: req.configs.api_base_url + 'admin/books/approve-request-edit/' + req.params.id,
        form: {},
        headers: objectHeaders.headers({'Authorization': req.session.access_token})
    }, function (error, response, body) {
        if (!error && response.statusCode === 200) {
            try {
                req.flash('info', 'Approve success');
                return res.redirect('/admin/waiting-request-edit-book');
            } catch (errorJSONParse) {
                req.flash('error', 'Unknown error');
                return res.redirect('/admin/waiting-request-edit-book');
            }
        } else {
            if (response.statusCode == 401) {
                req.flash('error', 'Please login to approve this book');
                return res.redirect('/');
            } else {
                req.flash('error', 'Sorry, something went wrong');
                return res.redirect('/admin/waiting-request-edit-book');
            }
        }
    });
});

router.get('/categories', authorize.isAdmin, function (req, res, next) {
    var page = req.query.page ? req.query.page : 1;
    request({
        url: req.configs.api_base_url + 'admin/categories/all?page=' + page,
        headers: objectHeaders.headers({'Authorization': req.session.access_token})
    }, function (error, response, body) {
        if (!error && response.statusCode === 200) {
            try {
                var data = JSON.parse(body);
                var paginate = helper.paginate({
                    total_record: data.items.total,
                    current_page: page,
                    link: `${req.configs.web_domain}:${req.configs.port}/admin/categories?page={?}`
                });
                res.render('admin/categories', {
                    layout: 'admin/layout/admin_template',
                    dataRequest: data,
                    pageTitle: 'Admin Dashboard',
                    paginate: paginate,
                    info: req.flash('info'),
                    error: req.flash('error'),
                    activeCategory: true,
                });
            } catch (errorJSONParse) {
                req.flash('error', 'Unknown error');
                return res.redirect('/admin');
            }
        } else {
            req.flash('error', 'Sorry, something went wrong');
            return res.redirect('/admin');
        }
    });
});

router.get('/categories/search', authorize.isAdmin, function (req, res, next) {
    var page = req.query.page ? req.query.page : 1;
    var keyWord = (typeof(req.query.key_word) != 'undefined') ? req.query.key_word : '';
    if (keyWord.trim() == '') {
        req.flash('error', 'Please input something to search');
        return res.redirect('/admin/categories');
    }
    request.post({
        url: req.configs.api_base_url + 'admin/categories/search/',
        form: {
            'key': keyWord,
            'page': page
        },
        headers: objectHeaders.headers({'Authorization': req.session.access_token})
    }, function (error, response, body) {
        if (!error && response.statusCode === 200) {
            try {
                var data = JSON.parse(body);
                var paginate = helper.paginate({
                    total_record: data.items.total,
                    current_page: page,
                    link: `${req.configs.web_domain}:${req.configs.port}/admin/categories/search?key_word=${keyWord}&page={?}`
                });
                res.render('admin/categories', {
                    layout: 'admin/layout/admin_template',
                    dataRequest: data,
                    pageTitle: 'Admin Dashboard',
                    paginate: paginate,
                    info: req.flash('info'),
                    error: req.flash('error'),
                    activeCategory: true,
                });
            } catch (errorJSONParse) {
                req.flash('error', 'Unknown error');
                return res.redirect('/admin/categories');
            }
        } else {
            req.flash('error', 'Sorry, something went wrong');
            return res.redirect('/admin/categories');
        }
    })
});

router.get('/categories/create', authorize.isAdmin, function (req, res, next) {
    res.render('admin/create_category', {
        layout: 'admin/layout/admin_template',
        pageTitle: 'Create category',
        info: req.flash('info'),
        error: req.flash('error'),
        validate: req.flash('validate'),
        apiValidate: req.flash('apiValidate'),
        activeCategory: true
    });
});

router.post('/categories/store', authorize.isAdmin, function (req, res, next) {
    req.checkBody('name', 'Name field is required').notEmpty();
    req.checkBody('name', 'Name must have more than 2 characters').isLength({ min: 3 });

    req.getValidationResult().then(function (result) {
        if (!result.isEmpty()) {
            req.flash('validate', result.array());
            req.flash('error', 'Data invalid');
            res.redirect('/admin/categories/create');
        } else {
            request.post({
                url: req.configs.api_base_url + 'admin/categories',
                form: {
                    name: req.body.name,
                    description: req.body.description
                },
                headers: objectHeaders.headers({'Authorization': req.session.access_token})
            }, function (error, response, body) {
                if (!error && response.statusCode === 200) {
                    try {
                        req.flash('info', 'Create category success');
                        return res.redirect('/admin/categories');
                    } catch (errorJSONParse) {
                        return res.redirect('/admin/categories/create');
                    }
                } else if (response.statusCode === 422) {
                    var msg = JSON.parse(body);
                    req.flash('apiValidate', msg.message.description[0]);
                    req.flash('error', 'Data invalid');
                    return res.redirect('/admin/categories/create');
                } else {
                    req.flash('error', 'Sorry, something went wrong');
                    return res.redirect('/admin/categories/create');
                }
            });
        }
    });
});

router.get('/categories/detail/:id', authorize.isAdmin, function (req, res, next) {
    var categoryId = req.params.id;

    request.get({
        url: req.configs.api_base_url + 'admin/categories/detail/' + categoryId,
        headers: objectHeaders.headers({'Authorization': req.session.access_token})
    }, function (error, response, body) {
        if (!error && response.statusCode === 200) {
            try {
                var data = JSON.parse(body);
                res.render('admin/edit_category', {
                    layout: 'admin/layout/admin_template',
                    pageTitle: 'Edit category',
                    category: data,
                    info: req.flash('info'),
                    error: req.flash('error'),
                    validate: req.flash('validate'),
                    apiValidate: req.flash('apiValidate'),
                    activeCategory: true,
                });
            } catch (errorJSONParse) {
                req.flash('error', 'Unknown error');
                return res.redirect('/admin/categories');
            }
        } else {
            req.flash('error', 'Something went wrong');
            return res.redirect('/admin/categories');
        }
    });
});

router.post('/categories/update', authorize.isAdmin, function (req, res, next) {
    var categoryId = req.body.id;
    if (!categoryId || categoryId == '') {
        req.flash('error', 'Category data misssing');
        res.redirect('back')
    } else {
        request.put({
            url: req.configs.api_base_url + 'admin/categories/' + categoryId,
            form: {
                name: req.body.name,
                description: req.body.description
            },
            headers: objectHeaders.headers({'Authorization': req.session.access_token})
        }, function (error, response, body) {
            if (!error && response.statusCode === 200) {
                try {
                    req.flash('info', 'Update category success');
                    res.redirect('/admin/categories');
                } catch (errorJSONParse) {
                    req.flash('error', 'Unknown error');
                    res.redirect('/admin/categories');
                }
            } else if (response.statusCode === 422) {
                var msg = JSON.parse(body);
                req.flash('apiValidate', msg.message.description[0]);
                req.flash('error', 'Data invalid');
                return res.redirect('back');
            } else {
                req.flash('error', 'Something went wrong');
                return res.redirect('/admin/categories');
            }
        });
    }
});

router.get('/users', authorize.isAdmin, function (req, res, next) {
    var page = req.query.page ? req.query.page : 1;
    request({
        url: req.configs.api_base_url + 'admin/users?page=' + page,
        headers: objectHeaders.headers({'Authorization': req.session.access_token})
    }, function (error, response, body) {
        if (!error && response.statusCode === 200) {
            try {
                var data = JSON.parse(body);
                var paginate = helper.paginate({
                    total_record: data.items.total,
                    current_page: page,
                    link: `${req.configs.web_domain}:${req.configs.port}/admin/users?page={?}`
                });
                res.render('admin/users', {
                    layout: 'admin/layout/admin_template',
                    dataRequest: data,
                    pageTitle: 'Admin Dashboard',
                    paginate: paginate,
                    info: req.flash('info'),
                    error: req.flash('error'),
                    activeUser: true,
                });
            } catch (errorJSONParse) {
                req.flash('error', 'Unknown error');
                return res.redirect('/admin');
            }
        } else {
            req.flash('error', 'Something went wrong');
            return res.redirect('/admin');
        }
    });
});

router.get('/users/search', authorize.isAdmin, function (req, res, next) {
    var error = 0;
    var page = (typeof(req.query.page) != 'undefined') ? req.query.page : 1;
    var keyWord = (typeof(req.query.key_word) != 'undefined') ? req.query.key_word : '';
    if (keyWord.trim() == '') {
        req.flash('error', 'Please input something to search');
        return res.redirect('/admin/users');
    }
    var filterType = (typeof(req.query.filter_type) != 'undefined') ? req.query.filter_type : '';
    if (filterType.trim() == '') {
        req.flash('error', 'Please choose a search type');
        return res.redirect('/admin/users');
    }
    request.post({
        url: req.configs.api_base_url + 'admin/users/search',
        form: {
            'key': keyWord,
            'page': page,
            'type': filterType
        },
        headers: objectHeaders.headers({'Authorization': req.session.access_token})
    }, function (error, response, body) {
        if (!error && response.statusCode === 200) {
            try {
                var data = JSON.parse(body);
                var paginate = helper.paginate({
                    total_record: data.items.total,
                    current_page: page,
                    link: `${req.configs.web_domain}:${req.configs.port}/admin/users/search?filter_type=${filterType}&key_word=${keyWord}&page={?}`
                });
                res.render('admin/users', {
                    layout: 'admin/layout/admin_template',
                    dataRequest: data,
                    pageTitle: 'Admin Dashboard',
                    paginate: paginate,
                    info: req.flash('info'),
                    error: req.flash('error'),
                    activeUser: true,
                });
            } catch (errorJSONParse) {
                req.flash('error', 'Unknown error');
                return res.redirect('/admin/users');
            }
        } else {
            req.flash('error', 'Something went wrong');
            return res.redirect('/admin/users');
        }
    });
});

router.get('/books', authorize.isAdmin, function (req, res, next) {
    var page = req.query.page ? req.query.page : 1;
    request({
        url: req.configs.api_base_url + 'admin/books?page=' + page,
        headers: objectHeaders.headers({'Authorization': req.session.access_token})
    }, function (error, response, body) {
        if (!error && response.statusCode === 200) {
            try {
                var data = JSON.parse(body);
                var paginate = helper.paginate({
                    total_record: data.items.total,
                    current_page: page,
                    link: `${req.configs.web_domain}:${req.configs.port}/admin/books?page={?}`
                });
                res.render('admin/books', {
                    layout: 'admin/layout/admin_template',
                    dataRequest: data,
                    pageTitle: 'Admin Dashboard',
                    paginate: paginate,
                    info: req.flash('info'),
                    error: req.flash('error'),
                    activeBook: true,
                });
            } catch (errorJSONParse) {
                req.flash('error', 'Unknown error');
                return res.redirect('/admin');
            }
        } else {
            req.flash('error', 'Something went wrong');
            return res.redirect('/admin');
        }
    });
});

router.get('/books/search', authorize.isAdmin, function (req, res, next) {
    var error = 0;
    var page = (typeof(req.query.page) != 'undefined') ? req.query.page : 1;
    var keyWord = (typeof(req.query.key_word) != 'undefined') ? req.query.key_word : '';
    if (keyWord.trim() == '') {
        req.flash('error', 'Please input something to search');
        return res.redirect('/admin/books');
    }
    var filterType = (typeof(req.query.filter_type) != 'undefined') ? req.query.filter_type : '';
    if (filterType.trim() == '') {
        req.flash('error', 'Please choose a search type');
        return res.redirect('/admin/books');
    }
    
    request.post({
        url: req.configs.api_base_url + 'admin/books/search',
        form: {
            'key': keyWord,
            'page': page,
            'type': filterType
        },
        headers: objectHeaders.headers({'Authorization': req.session.access_token})
    }, function (error, response, body) {
        if (!error && response.statusCode === 200) {
            try {
                var data = JSON.parse(body);
                var paginate = helper.paginate({
                    total_record: data.items.total,
                    current_page: page,
                    link: `${req.configs.web_domain}:${req.configs.port}/admin/books/search?filter_type=${filterType}&key_word=${keyWord}&page={?}`
                });
                res.render('admin/books', {
                    layout: 'admin/layout/admin_template',
                    dataRequest: data,
                    pageTitle: 'Admin Dashboard',
                    paginate: paginate,
                    info: req.flash('info'),
                    error: req.flash('error'),
                    activeBook: true,
                });
            } catch (errorJSONParse) {
                req.flash('error', 'Unknown error');
                return res.redirect('/admin/books');
            }
        } else {
            req.flash('error', 'Something went wrong');
            return res.redirect('/admin/books');
        }
    });
});

module.exports = router;

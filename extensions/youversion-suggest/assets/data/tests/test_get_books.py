#!/usr/bin/env python3
# coding=utf-8

import unittest
from unittest.mock import NonCallableMock, patch

from nose2.tools.decorators import with_setup, with_teardown

import tests
from utilities.book_parser import get_books

case = unittest.TestCase()


with open('tests/json/books.json') as json_file:
    json_content = json_file.read()
    patch_requests_get = patch(
        'httpx.get', return_value=NonCallableMock(
            text=json_content))


def set_up():
    patch_requests_get.start()
    tests.set_up()


def tear_down():
    patch_requests_get.stop()
    tests.tear_down()


@with_setup(set_up)
@with_teardown(tear_down)
def test_get_books():
    """should fetch book list in proper format"""
    books = get_books(default_version=75)
    case.assertEqual(len(books), 3)
    case.assertListEqual(books, [
        {
            'id': 'gen',
            'name': 'Genesis',
        },
        {
            'id': '1sa',
            'name': '1 Samuël',
        },
        {
            'id': 'jhn',
            'name': 'Johannes',
        }
    ])


@with_setup(set_up)
@with_teardown(tear_down)
@patch('httpx.get', return_value=NonCallableMock(text=json_content))
def test_get_books_url(requests_get):
    """should fetch book list for the given default version"""
    default_version = 75
    get_books(default_version)
    requests_get.assert_called_once_with(
        'https://www.bible.com/json/bible/books/{}'.format(default_version),
        headers={'user-agent': 'YouVersion Suggest'})


@with_setup(set_up)
@with_teardown(tear_down)
@patch('httpx.get', return_value=NonCallableMock(text='{}'))
def test_get_books_nonexistent(requests_get):
    """should raise error when book list cannot be found"""
    with case.assertRaises(RuntimeError):
        get_books(default_version=123)


@with_setup(set_up)
@with_teardown(tear_down)
@patch('httpx.get', return_value=NonCallableMock(text=json_content))
@patch('utilities.book_parser.get_book_metadata', return_value={'books': {}})
def test_get_books_empty(get_book_metadata, requests_get):
    """should raise error when book list is empty"""
    with case.assertRaises(RuntimeError):
        get_books(default_version=123)

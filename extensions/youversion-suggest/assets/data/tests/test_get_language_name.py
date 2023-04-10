#!/usr/bin/env python3
# coding=utf-8

import unittest
from unittest.mock import NonCallableMock, patch

import httpx
from nose2.tools.decorators import with_setup, with_teardown

import tests
from utilities.language_parser import get_language_name, get_languages_json

case = unittest.TestCase()


with open('tests/json/languages.json') as json_file:
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
    get_languages_json.cache_clear()


@with_setup(set_up)
@with_teardown(tear_down)
def test_get_language_name():
    """should fetch language name for the given language ID"""
    language_name = get_language_name('spa_es')
    case.assertEqual(language_name, 'Español (España)')


@with_setup(set_up)
@with_teardown(tear_down)
def test_get_language_name_cache():
    """should cache languages HTML after initial fetch"""
    if hasattr(get_languages_json, 'cache_clear'):
        get_languages_json.cache_clear()
    get_language_name('spa')
    language_name = get_language_name('fra')
    httpx.get.assert_called_once()
    case.assertEqual(language_name, 'Français')


@with_setup(set_up)
@with_teardown(tear_down)
@patch('httpx.get', return_value=NonCallableMock(text='{}'))
def test_get_language_name_no_data(requests_get):
    """should raise error when language list cannot be found"""
    with case.assertRaises(RuntimeError):
        get_language_name(language_id='eng')


@with_setup(set_up)
@with_teardown(tear_down)
def test_get_language_name_nonexistent():
    """should raise error when language name cannot be found"""
    with case.assertRaises(RuntimeError):
        get_language_name(language_id='xyz')

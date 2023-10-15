#!/usr/bin/env python3
# coding=utf-8

import unittest
from unittest.mock import NonCallableMock, patch

from nose2.tools.decorators import with_setup, with_teardown

import tests
from utilities.version_parser import get_versions

case = unittest.TestCase()


with open('tests/json/versions.json') as json_file:
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
def test_get_versions():
    """should fetch version list in proper format"""
    versions = get_versions('deu')
    case.assertEqual(len(versions), 6)
    case.assertListEqual(versions, [
        {
            'full_name': 'Amplified Bible, Classic Edition',
            'id': 8,
            'name': 'AMPC',
        },
        {
            'full_name': 'World English Bible 神',
            'id': 206,
            'name': 'WEB-神',
        },
        {
            'full_name': 'World English Bible 上帝上',
            'id': 207,
            'name': 'WEB-上帝上',
        },
        {
            'full_name': 'World English Bible 上帝',
            'id': 208,
            'name': 'WEB-上帝',
        },
        {
            'full_name': 'Revised Version 1885',
            'id': 477,
            'name': 'RV1885',
        },
        {
            'full_name': 'NeÜ bibel.heute',
            'id': 877,
            'name': 'NBH',
        }
    ])


@with_setup(set_up)
@with_teardown(tear_down)
@patch('httpx.get', return_value=NonCallableMock(text=json_content))
def test_get_versions_url(requests_get):
    """should fetch version list for the given language ID"""
    language_id = 'nld'
    get_versions(language_id)
    requests_get.assert_called_once_with(
        'https://www.bible.com/json/bible/versions/{}?filter='.format(
            language_id),
        headers={'user-agent': 'YouVersion Suggest'})


@with_setup(set_up)
@with_teardown(tear_down)
@patch('httpx.get', return_value=NonCallableMock(text='{"items":[]}'))
def test_get_versions_empty(requests_get):
    """should raise error when version list is empty"""
    with case.assertRaises(RuntimeError):
        get_versions('eng')


@with_setup(set_up)
@with_teardown(tear_down)
@patch('httpx.get', return_value=NonCallableMock(text='{}'))
def test_get_versions_nonexistent(requests_get):
    """should raise error when language does not exist"""
    with case.assertRaises(RuntimeError):
        get_versions('xyz')

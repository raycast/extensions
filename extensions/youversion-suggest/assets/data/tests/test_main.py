#!/usr/bin/env python3
# coding=utf-8

import unittest
from unittest.mock import patch

from nose2.tools.decorators import with_setup, with_teardown

import utilities.add_language as add_lang
from tests import set_up, tear_down
from tests.decorators import redirect_stdout

case = unittest.TestCase()


@with_setup(set_up)
@with_teardown(tear_down)
@patch('utilities.add_language.update_language_list')
@patch('utilities.add_language.save_bible')
@patch('utilities.add_language.get_bible', return_value={})
@patch('utilities.language_parser.get_language_name', return_value='Swedish')
@redirect_stdout
def test_add_language(out, get_language_name, get_bible, save_bible,
                      update_language_list):
    """should perform all necessary steps to add a language"""
    language_id = 'swe'
    language_name = 'Swedish'
    default_version = 33
    add_lang.add_language(language_id, default_version)
    get_language_name.assert_called_once_with(language_id)
    get_bible.assert_called_once_with(
        language_id=language_id,
        language_name=language_name,
        default_version=default_version)
    update_language_list.assert_called_once_with(
        language_id, get_language_name.return_value)


@patch('sys.argv', [add_lang.__file__, 'swe',
                    '--default-version', '33'])
@patch('utilities.add_language.add_language')
@redirect_stdout
def test_main(out, add_language):
    """main function should pass correct arguments to add_language"""
    add_lang.main()
    add_language.assert_called_once_with(
        language_id='swe', default_version=33)


@patch('sys.argv', [add_lang.__file__, 'spa-es'])
@patch('utilities.add_language.add_language')
@redirect_stdout
def test_main_normalize_language_id_dash(out, add_language):
    """main function should properly format language IDs containing dashes"""
    add_lang.main()
    add_language.assert_called_once_with(
        language_id='spa_es', default_version=None)


@patch('sys.argv', [add_lang.__file__, 'spa_ES'])
@patch('utilities.add_language.add_language')
@redirect_stdout
def test_main_normalize_language_id_case(out, add_language):
    """main function should properly format language IDs with mixed case"""
    add_lang.main()
    add_language.assert_called_once_with(
        language_id='spa_es', default_version=None)


@patch('utilities.add_language.add_language', side_effect=KeyboardInterrupt)
@patch('utilities.add_language.parse_cli_args')
@redirect_stdout
def test_main_keyboardinterrupt(out, parse_cli_args, add_language):
    """main function should quit gracefully when ^C is pressed"""
    case.assertIsNone(add_lang.main())

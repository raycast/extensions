#!/usr/bin/env python3
# coding=utf-8

import unittest
from unittest.mock import patch

import utilities.update_languages as update_langs
from tests.decorators import redirect_stdout

case = unittest.TestCase()


@patch('utilities.update_languages.update_language')
@redirect_stdout
def test_update_languages(out, update_language):
    """should update all languages"""
    update_langs.update_languages()
    case.assertGreaterEqual(out.getvalue().count('\n'), 20)
    case.assertGreaterEqual(update_language.call_count, 20)
    update_language.assert_any_call('eng')
    update_language.assert_any_call('swe')
    update_language.assert_any_call('deu')


@patch('utilities.update_languages.update_languages',
       side_effect=KeyboardInterrupt)
@redirect_stdout
def test_main_keyboardinterrupt(out, update_languages):
    """main function should quit gracefully when ^C is pressed"""
    case.assertIsNone(update_langs.main())

#!/usr/bin/env python3
# coding=utf-8

import copy
import json
import os
import os.path
import unittest

from nose2.tools.decorators import with_setup, with_teardown

import utilities
import utilities.add_language as add_lang
from tests import set_up, tear_down

case = unittest.TestCase()

LANGUAGE_ID = 'swe'
BIBLE = {
    'books': [{'id': 'gen', 'name': 'Första Moseboken'}],
    'default_version': 33,
    'versions': [{'id': 33, 'name': 'BSV'}, {'id': 154, 'name': 'B2000'}]
}


@with_setup(set_up)
@with_teardown(tear_down)
def test_save_bible_new():
    """should save Bible data to new data file if it doesn't exist"""
    bible_file_path = os.path.join(
        utilities.PACKAGED_DATA_DIR_PATH, 'bible',
        'bible-{}.json'.format(LANGUAGE_ID))
    add_lang.save_bible(language_id=LANGUAGE_ID, bible=BIBLE)
    case.assertTrue(os.path.exists(bible_file_path))
    with open(bible_file_path, 'r') as bible_file:
        saved_bible = json.load(bible_file)
        case.assertEqual(saved_bible, BIBLE)


@with_setup(set_up)
@with_teardown(tear_down)
def test_save_bible_existing():
    """should update Bible data in existing data file"""
    bible_file_path = os.path.join(
        utilities.PACKAGED_DATA_DIR_PATH, 'bible',
        'bible-{}.json'.format(LANGUAGE_ID))
    with open(bible_file_path, 'w') as bible_file:
        json.dump(BIBLE, bible_file)
    new_bible = copy.deepcopy(BIBLE)
    new_bible['default_version'] = 154
    add_lang.save_bible(language_id=LANGUAGE_ID, bible=new_bible)
    case.assertTrue(os.path.exists(bible_file_path))
    with open(bible_file_path, 'r') as bible_file:
        saved_bible = json.load(bible_file)
        case.assertEqual(saved_bible, new_bible)

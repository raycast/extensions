#!/usr/bin/env python3
# coding=utf-8

import json
import unittest

case = unittest.TestCase()


def get_book_metadata():
    with open('bible/book-metadata.json', 'r') as book_metadata_file:
        return json.load(book_metadata_file)


def test_chapter_verse_correspondence():
    """should have a verse count for every chapter in the metadata store"""
    book_metadata = get_book_metadata()
    for book_id, book_metadata_item in book_metadata.items():
        chapter_count = book_metadata_item['chapters']
        verse_count = len(book_metadata_item['verses'])
        fail_msg = 'book {} has {} chapters but {} verse counts'.format(
            book_id, chapter_count, verse_count)
        yield case.assertEqual, verse_count, chapter_count, fail_msg

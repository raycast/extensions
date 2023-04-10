#!/usr/bin/env python3
# coding=utf-8

import json
import os
import os.path

from utilities.requester import get

# The pattern used to identify the <script> tag containing the relevant Bible
# data
raw_books_patt = r'window\.Bible\.__INITIAL_STATE__ = ({(?:.*?)});'


# Retrieves metadata for every book of the Bible
def get_book_metadata():

    book_metadata_path = os.path.join('bible', 'book-metadata.json')
    with open(book_metadata_path, 'r') as book_metadata_file:
        return json.load(book_metadata_file)


# Convert the given raw book JSON to a schema-compliant dictionary
def get_book(raw_book):
    return {
        'id': raw_book['usfm'].lower().strip(),
        # Do not use human_long
        'name': raw_book['human'].strip()
    }


# Retrieve only the books for which this project has associated chapter data;
# this project has chosen to only include books from the Biblical Canon
def get_canon_books(books):
    book_metadata = get_book_metadata()
    return [book for book in books if book['id'] in book_metadata]


# Retrieves all books listed on the chapter page in the given default version
def get_books(default_version):

    books_url = 'https://www.bible.com/json/bible/books/{}'.format(
        default_version)
    raw_books = json.loads(get(books_url).text)

    if not raw_books:
        raise RuntimeError('Cannot fetch book list')

    books = get_canon_books(
        get_book(raw_book) for raw_book in raw_books['items'])
    if not books:
        raise RuntimeError('Book list is empty')

    return books

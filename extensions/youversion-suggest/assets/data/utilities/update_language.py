#!/usr/bin/env python3
# coding=utf-8

# This language utility updates an existing Bible data file for the given
# language (using existing data, such as default version, to recreate the data
# file)

import argparse
import json
import os
import os.path

import utilities
from utilities.add_language import add_language


# Parses all command-line arguments
def parse_cli_args():

    parser = argparse.ArgumentParser()
    parser.add_argument(
        'language_id',
        metavar='code',
        help='the ISO 639-3 code of the language')

    return parser.parse_args()


# Retrieves bible data object (books, versions, ecase.) for the given language
def get_bible(language_id):

    bible_path = os.path.join(
        utilities.PACKAGED_DATA_DIR_PATH, 'bible',
        'bible-{}.json'.format(language_id))
    with open(bible_path, 'r') as bible_file:
        return json.load(bible_file)


# Updates the Bible data file for the language with the given ID
def update_language(language_id):

    bible = get_bible(language_id)
    default_version = bible['default_version']

    print('Updating language \'{}\' data...'.format(
        language_id))
    add_language(
        language_id=language_id,
        default_version=default_version)
    print('Updated language \'{}\' data!'.format(
        language_id))


def main():

    try:
        cli_args = parse_cli_args()
        update_language(language_id=cli_args.language_id)
    except KeyboardInterrupt:
        pass


if __name__ == '__main__':
    main()

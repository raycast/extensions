#!/usr/bin/env python3
# coding=utf-8

# This language utility adds support for a language to YouVersion Suggest by
# gathering and parsing data from the YouVersion website to create all needed
# language files; this utility can also be used to update any Bible data for an
# already-supported language

import argparse
import io
import json
import os
import os.path
from operator import itemgetter

import utilities
import utilities.book_parser as book_parser
import utilities.language_parser as language_parser
import utilities.version_parser as version_parser

# Parameters for structuring JSON data
JSON_PARAMS = {
    'indent': 2,
    'separators': (',', ': '),
    'ensure_ascii': False,
    'sort_keys': True
}


# Constructs object representing all Bible data for a particular version
# This data includes the list of books, list of versions, and default version
def get_bible(language_id, language_name, default_version=None):

    bible = {}
    bible['language'] = {
        'id': language_id,
        'name': language_name
    }
    bible['versions'] = version_parser.get_versions(language_id)

    # If no explicit default version is given, use version with smallest ID
    if not default_version:
        default_version = min(bible['versions'], key=itemgetter('id'))['id']
    elif not any(version['id'] == default_version for version in
                 bible['versions']):
        raise RuntimeError(
            'Given default version does not exist in language')

    bible['default_version'] = default_version
    bible['books'] = book_parser.get_books(default_version=default_version)
    return bible


# Writes the given JSON object to a file
def write_json(json_object, json_file):

    json_str = json.dumps(json_object, **JSON_PARAMS)
    json_file.write(json_str)
    json_file.write('\n')


# Constructs the Bible data object and save it to a JSON file
def save_bible(language_id, bible):

    bible_path = os.path.join(
        utilities.PACKAGED_DATA_DIR_PATH, 'bible',
        'bible-{}.json'.format(language_id))
    with io.open(bible_path, 'w', encoding='utf-8') as bible_file:
        write_json(bible, bible_file)


# Adds this language's details (name, code) to the list of supported languages
def update_language_list(language_id, language_name):

    langs_path = os.path.join(
        utilities.PACKAGED_DATA_DIR_PATH, 'bible', 'languages.json')
    with io.open(langs_path, 'r+', encoding='utf-8') as langs_file:
        langs = json.load(langs_file)
        langs[:] = [lang for lang in langs if lang['id'] != language_id]
        langs.append({
            'id': language_id,
            'name': language_name
        })
        langs.sort(key=itemgetter('id'))
        langs_file.truncate(0)
        langs_file.seek(0)
        write_json(langs, langs_file)


# Adds to the worklow support for the language with the given parameters
def add_language(language_id, default_version=None):

    print('- Fetching language data...')
    language_name = language_parser.get_language_name(language_id)

    print('- Adding Bible data...')
    bible = get_bible(
        language_id=language_id,
        language_name=language_name,
        default_version=default_version)
    save_bible(language_id, bible)

    print('- Updating language list...')
    update_language_list(language_id, language_name)


# Parses all command-line arguments
def parse_cli_args():

    parser = argparse.ArgumentParser()
    parser.add_argument(
        'language_id',
        metavar='code',
        help='the ISO 639-3 code of the language')
    parser.add_argument(
        '--default-version',
        type=int,
        help='the default version to use for this language')

    return parser.parse_args()


def main():

    try:
        cli_args = parse_cli_args()
        print('Adding language \'{}\' data...'.format(
            cli_args.language_id))
        add_language(
            language_id=cli_args.language_id.replace('-', '_').lower(),
            default_version=cli_args.default_version)
        print('Added language \'{}\' data!'.format(
            cli_args.language_id))
    except KeyboardInterrupt:
        pass


if __name__ == '__main__':
    main()

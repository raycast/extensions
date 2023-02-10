#!/usr/bin/env python3

# This language utility updates all existing Bible data files

import json

from utilities.update_language import update_language


# Retrieve the basic JSON data for all languages
def get_languages():
    with open('bible/languages.json', 'r') as languages_file:
        return json.load(languages_file)


# Updates the Bible data file for every stored language
def update_languages():

    for language in get_languages():
        update_language(language['id'])
        print('')


def main():

    try:
        update_languages()
    except KeyboardInterrupt:
        pass


if __name__ == '__main__':
    main()

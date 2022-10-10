#!/usr/bin/env python3
# coding=utf-8

import functools
import json

from utilities.requester import get


@functools.lru_cache(maxsize=1)
def get_languages_json():
    return json.loads(
        get('https://www.bible.com/json/bible/languages').text)


def get_language(raw_language):
    return {
        'id': raw_language['tag'],
        'name': raw_language['local_name']
    }


# Retrieves the language with
def get_language_name(language_id):

    raw_languages = get_languages_json()

    if not raw_languages:
        raise RuntimeError('Cannot fetch language list')

    languages = (get_language(raw_language)
                 for raw_language in raw_languages['items'])

    for language in languages:
        if language['id'] == language_id:
            return language['name']

    raise RuntimeError('Cannot find language with name')

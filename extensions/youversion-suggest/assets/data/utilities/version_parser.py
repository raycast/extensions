#!/usr/bin/env python3
# coding=utf-8

import itertools
import json
from operator import itemgetter

from utilities.requester import get


# Convert the given version element to a JSON dictionary
def get_version(raw_version):
    return {
        'id': raw_version['id'],
        'name': raw_version['local_abbreviation'],
        'full_name': raw_version['local_title']
    }


# Returns a copy of the given version list with duplicates removed
def get_unique_versions(versions):

    # When multiple versions with the same name are encountered, favor the
    # version with the lowest ID
    return [min(group, key=itemgetter('id'))
            for name, group in itertools.groupby(versions,
                                                 key=itemgetter('name'))]


# Retrieves all versions listed on the chapter page in the given language code
def get_versions(language_id):

    url_base = 'https://www.bible.com/json/bible'
    versions_url = '{}/versions/{}?filter='.format(url_base, language_id)
    raw_versions = json.loads(get(versions_url).text)

    if not raw_versions:
        raise RuntimeError('Cannot fetch version list')

    versions = [get_version(raw_version)
                for raw_version in raw_versions['items']]
    if not versions:
        raise RuntimeError('Version list is empty')

    unique_versions = get_unique_versions(versions)
    unique_versions.sort(key=itemgetter('id'))

    return unique_versions

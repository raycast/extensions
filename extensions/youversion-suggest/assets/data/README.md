# YouVersion Suggest Data v5.0.0

*Copyright 2014-2023 Caleb Evans*  
*Code released under the MIT license*

*This project is not affiliated with YouVersion, and all Bible content is
copyright of the respective publishers.*

[![tests](https://github.com/caleb531/youversion-suggest-data/actions/workflows/tests.yml/badge.svg)](https://github.com/caleb531/youversion-suggest-data/actions/workflows/tests.yml)
[![Coverage Status](https://coveralls.io/repos/caleb531/youversion-suggest-data/badge.svg?branch=master)](https://coveralls.io/r/caleb531/youversion-suggest-data?branch=master)

This repository consists of Bible language data gathered from the YouVersion
website, for use by my [Alfred workflow][alfred], [Raycast extension][raycast],
and my (unreleased) [Chrome extension][chrome].

[chrome]: https://github.com/caleb531/youversion-suggest-chrome
[alfred]: https://alfred.app/workflows/caleb531/youversion-suggest/
[raycast]: https://www.raycast.com/caleb531/youversion-suggest

## Setup

```sh
# Install virtualenv package globally
pip3 install virtualenv
# Setup virtualenv for project
virtualenv --python=python3 ./.virtualenv
source ./.virtualenv/bin/activate
# Install project dependencies
pip install -r requirements.txt
```

## Available Utilities

### Add new language to dataset

You can add support for a new language to the Bible dataset by running the
`add_language` utility. Just supply an [RFC 5646][rfc] language code as the only
argument (supported YouVersion language codes can be found
[here][language-list]), and the script will do the rest.

[rfc]: https://www.rfc-editor.org/rfc/rfc5646.html
[language-list]: https://www.bible.com/languages

```sh
python3 -m utilities.add_language mya_zaw
```

### Update Bible data for existing language in dataset

You can fetch the latest Bible data for an existing language in this repository
by running the `update_language` utility. Just supply the language code of a
language in this repository's `bible/languages.json`.

```sh
python3 -m utilities.update_language spa_es
```

## Update Bible data for all languages in dataset

You can fetch the latest Bible data for all language in this repository by
running the `update_languages` utility.

```sh
python3 -m utilities.update_languages
```

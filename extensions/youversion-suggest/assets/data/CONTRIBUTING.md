# Contributing to YouVersion Suggest

## Submitting an issue

### Bug reports

If you are submitting a bug report, please answer the following questions:

- What version of YouVersion Suggest were you using?
- What were you doing?
- What did you expect to happen?
- What happened instead?

### Requesting language support

If you would like to see YouVersion Suggest support a language not in the above
list, please [submit an GitHub issue][issues-page] with the following details:

- The name and ISO 639 code of the language from [this list][language-list] (*e.g.* spa_es)

- The name of the YouVersion-supported Bible version to use as the default for
this language; click the language name on the page linked above to view the
versions available for the language

If you're feeling adventurous, you may also try adding your own language using
the language utility apart the data module. See the section on **Adding language
support** below for more information.

## Contributing code

Pull requests for bug fixes and new features are always welcome. Please be sure
to add or update unit tests as appropriate. Follow the steps below to set up the
repository for contributing.

### Cloning data submodule

All of the Bible data used by YouVersion Suggest is sourced from a separate
repository. You must pull this data down to properly run this project:

```bash
git submodule update --recursive --init
```

### Configuring a virtualenv

The dependencies for the project and best run inside a `virtualenv`. For
instructions on how to configure virtual environments in Python, please see the
[Virtual Environments](http://docs.python-guide.org/en/latest/dev/virtualenvs/)
section of the Hitchhiker's Guide to Python.

### Installing project dependencies

You can install all project dependencies via `pip` (assuming your project
virtualenv is active):

```bash
pip install -r requirements.txt
```

### Running unit tests

The project's unit tests are written using and managed under the [nose][nose]
Python package. You can run all unit tests via the `nosetests` command (you can
also pass `--rednose` for colored test output):

```bash
nosetests --rednose
```

## Code coverage

The project currently boasts 100% code coverage across all source files.
Contributions are expected to maintain this high standard. You can view the
current coverage report via the `coverage` command:

```bash
coverage run -m nose --rednose
coverage report
```

If the coverage is ever less than 100%, you can generate and view a detailed
HTML view of the coverage report like so:

```bash
coverage html
open htmlcov/index.html
```

### Language storage

Every language supported by YouVersion Suggest is identified by an ISO 639-3
code (*e.g.* `nld`, `spa_es`). The IDs and native names of all supported
languages are listed in a single manifest file
(`yvs/data/bible/languages.json`). Each language also has a corresponding Bible
data file, where book and version information is stored (*e.g.*
`yvs/data/bible/bible-spa_es.json`).

### Adding language support

The project includes a special utility which substantially eases the task of
adding language support to the workflow. The utility must be run as a module and
must be provided the ISO 639-3 code of the language to add. YouVersion provides
[a complete list][language-list] of the languages it supports with their
respective language codes.

```bash
python -m utilities.add_language spa_es
```

You can also specify the numeric ID of the default version to use for this
language. Note that any user can override this default by setting their own
preferred version (via `yvset version`).

```bash
python -m utilities.add_language zho_tw --default-version 46
```

[issues-page]: https://github.com/caleb531/youversion-suggest/issues
[language-list]: https://www.bible.com/languages
[nose]: http://nose.readthedocs.io/en/latest/

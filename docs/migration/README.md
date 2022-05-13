# Migration

This section contains guides to help migrate your extension to a newer version of the API.

## How to automatically migrate your extensions

Whenever possible, we provide tools to automate the migration to a newer version of the API using [codemods](https://github.com/facebook/jscodeshift).

To run the codemods, run the following command in your extension directory:

```bash
npx ray migrate
```

or

```bash
npx @raycast/migration .
```

It will detect the version of the API you were previously using and apply all the migrations that have been available since.

After running it, do go through the updated files and make sure nothing is broken - there are always edge cases.

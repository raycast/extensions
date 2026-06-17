# Static Marks - Bookmark Search

This extension is made to search through your [Static Marks](https://github.com/darekkay/static-marks) bookmark YAML file.

## How to use

You'll have to provide the location of your [bookmarks YAML file](https://github.com/darekkay/static-marks#file-format), if you don't have one you can create it from your existing browser bookmarks with the [Static Marks CLI](https://github.com/darekkay/static-marks#quickstart).

The extension supports multiple input options:
- **Absolute path to a single file** (for example `/Users/[user folder]/bookmarks.yml`)
- **Absolute path to a folder** containing multiple YAML files (for example `/Users/[user folder]/bookmarks/`)
- **Public URL** to a single YAML file (like `https://raw.githubusercontent.com/darekkay/static-marks/master/test/examples/maximal-example.yml`)

When using a folder path, the extension will automatically read all `.yml` and `.yaml` files in that directory and combine them into a single searchable list.

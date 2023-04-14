# YouVersion Bible Suggest Changelog

# v2.1.0 - 2023-04-11

- Updated the Raycast API to the latest version (v1.49.2, at the time of
  writing)

# v2.0.1 - 2023-04-10

- Fixed a critical bug where the "Copy to Clipboard" functionality would return
  an error for any passage; all users are encouraged to upgrade to this release
- Fixed a critical bug where the "Search the Bible by Phrase" command would
  return no results

## v2.0.0 - 2022-09-18

### New Features

- Added new "Reference Format" preference, allowing you to control the format
  of copied Bible verses/chapters - See the README or the "Set Bible Preferences" command for details
- Revised command names to be clearer (e.g. "Look Up" instead of "Filter")
- Added Help information to Preferences view

### Breaking Changes

- Changed extension ID to remove \*-raycast suffix; if you're already using v1, this means that you will
  need to uninstall and reinstall the extension

## v1.0.0 - 2022-09-16

- Initial stable release

# YouVersion Bible Suggest Changelog

## [v3.3.0] - 2023-06-17

- Fixed a bug where "Search the Bible by Phrase" results were always in English
- Fixed a bug where copied Bible content was always in English
- Updated the Raycast API to the latest version (v1.53.4, at the time of
  writing)

## [v3.2.0] - 2023-06-03

- Fixed a recently-occurring error when fetching Bible content
- Under-the-hood improvements to improve the stability of the extension going forward

## [v3.1.0] - 2023-05-02

- Added a new setting to control the inclusion of verse numbers in copied Bible
  content
- Added a new setting to control the preservation of line breaks in copied Bible
  content (useful for verses from books like Psalms or Proverbs)
- Updated Raycast API to v1.50.1
- Removed obsolete code from codebase

## [v3.0.0] - 2023-04-25

- Fetched the latest Bible data from YouVersion
- Fixed a bug where the extension would not correctly retrieve Bible
  data when a non-English language (particularly one containing non-ASCII
  characters) was chosen

## [v2.1.0] - 2023-04-11

- Updated the Raycast API to the latest version (v1.49.2, at the time of
  writing)

## [v2.0.1] - 2023-04-10

- Fixed a critical bug where the "Copy to Clipboard" functionality would return
  an error for any passage; all users are encouraged to upgrade to this release
- Fixed a critical bug where the "Search the Bible by Phrase" command would
  return no results

## [v2.0.0] - 2022-09-18

### New Features

- Added new "Reference Format" preference, allowing you to control the format
  of copied Bible verses/chapters - See the README or the "Set Bible Preferences" command for details
- Revised command names to be clearer (e.g. "Look Up" instead of "Filter")
- Added Help information to Preferences view

### Breaking Changes

- Changed extension ID to remove \*-raycast suffix; if you're already using v1, this means that you will
  need to uninstall and reinstall the extension

## [v1.0.0] - 2022-09-16

- Initial stable release

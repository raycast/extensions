# Library Genesis Changelog

## [Added quick download] - 2022-07-17

- Added an action to quickly download the selected book to a local directory specified in a pop-up window.
- Make the primary action customizable in preference, the options are:
  - Open Download Page
  - Open Book Info Page
  - Download Book

## [Added search features] - 2022-07-17

- Added two features that are configurable in preferences
  - Automatically copy text from clipboard to the search field
  - Set preferred languages and prioritize them in the search results

## [Updated search books] - 2022-07-16

- Deprecated [libgen.js](https://github.com/dunn/libgen.js/) due to poor search results.
- Migrated to a custom scraper that parse raw html from a query request to libgen.
- Changed the default url to open in browser to the download page for convenience.

## [Added Library Genesis] - 2022-07-14

Initial version code

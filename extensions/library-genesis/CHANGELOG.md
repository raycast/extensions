# Library Genesis Changelog

## [Feature Updates] - 2022-07-21

- Supported downloading to a default directory

  - Users can download books always to a default directory.
  - If users prefer so, they can still manually pick directory by hand.

- Supported custom Libgen Mirror URL
  - As some users have reported that some mirrors are not available in their region, they can override the mirror URL in the extention configuration now.
  - This extension uses [libgen.js](https://github.com/dunn/libgen.js) for automatically choosing the fatest mirror, but the [available mirrors](https://github.com/dunn/libgen.js/blob/trunk/available_mirrors.js) supported are very limited. I'll later integrate the speedcheck without libgen.js and thus support more mirrors.
  -

## [Added sort by file formats] - 2022-07-21

User can sort the search result based on the preferred file formats.

## [Updated search books & added features] - 2022-07-20

- Updated seasch implementation
  - Deprecated [libgen.js](https://github.com/dunn/libgen.js/) due to poor search results.
  - Migrated to a custom scraper that parse raw html from a query request to libgen.
- Added two features that are configurable in preferences
  - Automatically copy text from clipboard to the search field
  - Set preferred languages and prioritize them in the search results
- Added an action to quickly download the selected book to a local directory specified in a pop-up window.
- Make the primary action customizable in user preference. The options are:
  - Open Download Page
  - Open Book Info Page
  - Download Book

## [Added Library Genesis] - 2022-07-14

Initial version code

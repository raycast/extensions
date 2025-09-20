# Library Genesis Changelog

## [Fix Search + Modernize] - 2025-07-30

- fix: search was not working due to site changes (ref: [Issue #20481](https://github.com/raycast/extensions/issues/20481))
- ⚠️ only downloads from default gateway
- automatically searches again on type change
- added: `libgen.bz`, `libgen.li`
- removed: `libgen.is`, `libgen.st`
- **Fiction** titles now support same items as all other
- Modernize to use latest Raycast config

## [Experimental Fiction Search] - 2024-10-22

- You can now choose to search for Fiction or Non-Fiction (default) titles every time. Fiction search results currently have the following:
  1. ⚠️ do not yet support your Language and Format Preferences
  2. ⚠️ do not show all the information e.g. no dates
  3. ✅ supports downloading
  4. ✅ supports opening in browser
  5. ⚠️ no book cover
- NOTE: Changing the type will not trigger the search again - you will need to re-type to get new results
- removed `libgen.rs` as it seems to be inactive - may be brought back in future

## [Ignore HTTPS Errors] - 2024-02-17

- Fixed an issue where `library.lol` gives certificate errors (ignore SSL errors) (#10798)
- Added an extra description in download error where the user is instructed to either choose a different mirror or ignore https errors
- Bump dependencies to latest version

## [Housekeeping] - 2023-12-05

- Removed [libgen](https://www.npmjs.com/package/libgen) dependency
  - The library is not maintained and had issues with old mirrors
- Removed `axios` because we can use `node-fetch` instead
- Updated all (dev) dependencies to latest version
- Added better code formatting and linting, cleaned up code
- Updated download controller, this is now cancellable
- Add Mirror List to the extension
  - This is a list of all mirrors that are currently available in the extension
- Cached fastest mirror
  - This is now cached for 1 hour, so we don't have to check for the fastest mirror every time

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

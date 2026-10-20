# IBM Bob Changelog

## [IBM Bob Insiders Support] - 2026-10-16

- Added a "Bob Version" preference to select between the Standard and Insiders build of IBM Bob
- All commands (Search Recent Projects, Open with IBM Bob, Open New Window) now target the selected build

## [Bug Fixes] - 2026-10-14

- Fixed "Search Recent Projects" returning no results by reading the database path dynamically from IBM Bob's `product.json` (`sharedDataFolderName`) instead of a hardcoded location, with a fallback to the global storage database
- Fixed project list being empty on initial render by handling a `null` filter value in `filterEntriesByType`

## [Initial Version] - 2026-06-19

- Forked from cursor-recent-projects extension
- Adapted for IBM Bob IDE
- Updated all branding and references from Cursor to IBM Bob
- Changed configuration directory from .cursor to .bobide
- Updated CLI path to use bobide executable
- Renamed commands and actions for IBM Bob
- Changed database path to IBM Bob's Application Support directory

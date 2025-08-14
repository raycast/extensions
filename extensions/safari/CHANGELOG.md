# Safari Changelog

## [Update] - 2025-06-19

- Fixes for `Search Tabs` command:
  - allows the components that display the tab list to re-render when device data changes.
  - allows the obtention of the local tabs even when the `areRemoteTabsUsed` ("iCloud devices" option) is set to `false`.

## [Update] - 2025-05-19

- Added a command to close all other tabs, leaving the current tab open.

## [Update] - 2025-03-18

- Fix for `Copy Title as Link to Clipboard` command: Prevent profile or tab group name being added to the start of the page title

## [Update] - 2025-03-05

- Added a fuzzy search option that can be enabled/disabled via preferences
- Improved search to match terms anywhere within bookmarks and other items

## [Update] - 2025-03-01

### New Tab Management Tools

- Added new AI tools for Safari tab management:
  - `get-all-tabs`: View all open tabs across all Safari windows
  - `get-tab-contents`: Retrieve text or HTML content from specific tabs
  - `close-tab`: Close specific tabs or the currently active tab
  - `get-focused-tab`: Get information about the currently active tab

## [Chore: Moved contributor to past contributors list] - 2025-02-27

## [Update] - 2025-02-21

AI Tools to;

- Search Bookmarks
- Search History
- Search Reading List
- Add to Reading List
- Open (in Safari)

## [Update] - 2025-02-14

- Added a preference to enable pinyin search for Chinese characters.

## [Update] - 2025-02-12

- Add an action to set the color of a bookmark tag.

## [Chore: Moved contributor to past contributors list] - 2025-01-15

## [Update] - 2025-01-12

- Adds a preference to "Copy Title as Link to Clipboard" command to clean up titles with AI.

## [Update] - 2025-01-07

- Adds a "Copy Title as Link to Clipboard" command to copy the current Safari tab in Markdown format.

## [Update] - 2025-01-06

- Adds a "Copy to Clipboard" command to copy the current Safari tab url.

## [Chore: Renamed title in Dropdown] - 2024-12-20

## [Improve] - 2024-12-13

- Add a preference for `Search Reading List` to hide items that have already been read.

## [Update] - 2024-12-03

- Added `pinyin` support for searching tab
- improved:
  - Added cache for formatted string
  - Reduced re-render times for `CloudTabs`

## [Improve] 2024-09-27

- Adds a preference to select between different fallback search types for the `Search Tabs` command.

## [Improve] - 2024-09-11

- Changed the behavior of the `Add to Reading List` command to add the current tab to the Reading List.

## [Improve] - 2024-08-09

- Changed fuzzy search weights

## [Fix] - 2024-07-26

- Fixed bug with fuzzy search and undefined `device.tabs`

## [Update] - 2024-07-25

- The default search has been changed to a fuzzy search. Refactored some code.

## [Update] - 2024-04-18

- Adds a preference to skip browsing iCloud tabs

## [Fix] - 2023-12-20

- Fix the title of ReadingListNonSync may possibly be null

## [Update] - 2023-04-24

- Adds a "Search Bookmarks" command to search all non-reading list bookmarks.

## [Update] - 2022-12-05

- Updated extension for faster performance
- Fixed flickering while fetching data

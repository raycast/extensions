# Arc Changelog

## [Improvements] - 2024-03-05

- Added the ability to filter by tab type in the 'Search Tabs' command.
- Lets you toggle between All Tabs, Favorites, Pinned, and Unpinned tabs via a dropdown.

## [Fixes] - 2024-03-04

- Fixed an issue in `Open New Little Arc Window` command where input in the URL field is not handled.

## [Improvements] - 2024-02-15

- Added an argument `space` to the `Open New Window` and `Open New Tab` commands to open a new window or tab in a specific space.
- Edited the AppleScript commands to open a new window or tab to use the `space` argument.

## [Fixes] - 2024-02-26

- Fixed an issue in the `Search History` command where quotation marks in the search text were causing a syntax error.

## [New Features] - 2024-02-18

- Added `Open New Note` command to open a new Note in Arc which is disabled by default.
- Added `Open New Easel` command to open a new Easel in Arc which is disabled by default.

## [Fixes] - 2024-02-14

- Fixed an issue where the `Search Tabs` command would not work if a tab title contained a backslash.

## [Fixes] - 2024-01-30

- Fix issue #10455: When opening a new tab and no window is open, a new window will be opened.

## [New Features] - 2024-01-29

- Added Kagi as a search engine for the commands `Search Arc` and `Open New Little Arc Window`.

## [Update] - 2024-01-26

- Update release notes url.

## [Update] - 2024-01-19

- A few commands are now disabled by default.

## [Fixes] - 2024-01-18

- Fix #10204, opening little arc without selected text doesn't throw an error anymore.

## [Improvements] - 2024-01-16

- If text is selected, the command `Open New Little Arc Window` will now open in a search for the selected text.
- If an URL is selected, the command `Open New Little Arc Window` will now open in the selected URL.
- The command `Open New Little Arc Window` now accepts a preference for which engine to use when searching.

## [Fixes] - 2024-01-05

- Fixed an issue (#8189) where a wrong tab could be randomly opened instead of the one selected.

## [Improvements & New Features] - 2023-12-08

- Improve behavior when opening a new tab, if no window is open, a new window is opened.
- Added `Open Arc Release Notes` command to open the release notes for the current version of Arc.
- Added `Open Arc Boost Gallery` command to open the gallery of Arc Boosts.

## [Improvements] - 2023-12-07

- The command `Open New Incognito Window` now accepts a URL.

## [Improvements] - 2023-10-16

- Allow multiple, comma separated tabs to be opened.

## [Improvements] - 2023-09-12

- Added a new `Open New Blank Window` command that opens a blank window in Arc.
- Added some new keywords to help with searching for the Arc Browser extension.

## [Fixes] - 2023-08-11

- Fixed an issue where, when searching for tabs with the same URL but different titles, the wrong tab would be opened.

## [Improvements] - 2023-06-30

- Expand Search Arc suggestions to available engines.

## [Improvements] - 2023-03-08

- Add a new command to open little arc.

## [Quicklinks] - 2023-02-15

- Added a new action to quickly create a quicklink from a page.

## [Improvements] - 2023-01-31

- Added preferences to configure the `Search Arc` command.

## [Improvements] - 2023-01-20

– Close Raycast when opening links in a new Little Arc window.

## [New Features] - 2023-01-19

– Search across tabs, history, and suggestions with the new "Search Arc" command.
– Quickly access spaces and favorites from your menu bar.
– Fallback to Google search if needed, just press "⌃ + ↵".

## [New Features] - 2023-01-13

– Search your sidebar.
– Search spaces.
– Jump to open tabs.
– Open incognito windows.

## [Initial Version] - 2022-11-21

Search the history of Arc!

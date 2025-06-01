# Folder Search Changelog

## Bug Fixes and Code Huygeine {PR_MERGE_DATE}
- moved code to use standard Raycast Cache / Localstorage
- Removed a lot of code that was causing unecessary issues with flickering and fallback
- I have tested the fallback issues and they appear fixed now, due to removing debouncing and some other gode
- Migrated PINs to localstorage
- Fixes some bugs with the plugins, added a new plugin to the plugin folder
- Fixes search results not showing when there are more than max results


## [Fixes & Improvements] - 2025-05-28
- **fixed** ESLint configuration migration from deprecated `.eslintrc.json` to new flat config format (`eslint.config.js`) for ESLint v9+ compatibility
- **added** Pin/Unpin functionality to the "Move to a Folder" command for consistent folder management across both search and move operations
- **fixed** Pin reordering actions (Move Pin Up/Down) now only appear in pinned sections, not in search results, for better UX clarity
- **fixed** Persistent issues with fallback invocation command handling - hopefully it works this time
- **enhanced** Code organization with proper TypeScript types for pin section detection

## [Fixes & Improvements] - 2025-05-05
- **improved** Error handling by replacing showToast with showFailureToast for better error reporting
- **fixed** Type issues with selectedItemId in List components
- **improved** Code organization and type safety in useFolderSearch hook
- **updated** Dependencies to latest versions (@raycast/api@1.81.2, @raycast/utils@1.19.1)
- **added** Filter option for Library folders
- **improved** Date handling and formatting
- **refactored** useFolderSearch hook to simplify state management
- **removed** Unnecessary debounce logic and state variables
- **streamlined** Preference saving mechanism
- **enhanced** User navigation in folder search actions
- **improved** Search execution conditions and performance

## [Fixes] - 2025-04-12
- **fixed** Search results flickering when using fallback command by adding 150ms debounce to search updates
- **improved** Search text handling by removing fixDoubleConcat workaround and relying on debouncing to handle rapid text changes

## [New Features] - 2025-03-13

- **added** 'Move' action for selected finder items

## [New Features] - 2024-08-20

- **added** Pins can now be ordered by `Move Pin Up` and `Move Pin Down` actions

## [Command rename] - 2023-06-16
- attempt #2 at fixing the fall back command with duplicated query.
- added Throttle to search to improve experience

## [Command rename] - 2023-06-13
Fixing Three Issues / Two bugs
- Extension only worked in English. Fixed up code to be language agnostic
- Sometimes the fallback invocation resulted in the search query being duplicated so "Query" would appear "QueryQuery". This is not consistent, but I added some code to deal with this issue.

## [Command rename] - 2023-05-17

- Rename the command to conform to the standards

## [New Features] - 2022-12-15

- **added** Can take selected Finder item(s) and allow you to move them to a selected folder via a new Action menu entry

## [New Features] - 2022-11-01

- **added** Sorting of results by `Last used` to bring most recently used (opened) to the top of repeated searches.
- **added** `Use count` to metadata/details view.

## [New Features] - 2022-10-28

- **added** Pins can now be searched using the new `Pinned` filter dropdown.
- **added** `Toggle Details` preference is now maintained between sessions.

## [New Features] - 2022-09-25

- **added** Enable 'exact' matching via [term] search

## [New Features] - 2022-09-14

- **added** Plugins support (see README for details)
- **added** Create Quicklink action
- **added** Open With... action
- **added** Show Info in Finder action

## [New Feature] - 2022-09-09

- **added** Ability to 'Pin' folders

## [Fixes & Improvements] - 2022-09-08

- **removed** 'size' meta property from detail view
- **removed** search 'throttle' to make searches more responsive
- **changed** Detail view so that it defaults to 'off'
- **added** Saving of 'Scope' preference between executions
- **added** Saving of 'Toggle Details' preference between executions
- **added** Message when waiting for initial search/search is empty

## [Initial Version] - 2022-09-08

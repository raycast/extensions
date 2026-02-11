# Folder Search Changelog

## [Enhancements] - 2025-06-18

- **enhanced** Added "Open Folder After Move" preference to control whether destination folders open automatically after moving files. When disabled, files will be moved without opening the folder, keeping your workflow uninterrupted. Default is enabled
- **enhanced** Added drag and drop support for results list

## [Development & Error Handling Improvements] - 2025-06-11

### Development & Logging Improvements
- **improved** Logging configuration now uses `environment.isDevelopment` for automatic development/production detection instead of hardcoded boolean
- **centralized** Logging configuration in `useFolderSearch.tsx` as the main orchestrator hook for better organization and visibility
- **improved** Development experience with automatic logging that enables in development mode and disables in production builds
- **maintained** Comprehensive debug logging for plugin loading, cache operations, and pin management while ensuring clean production builds

### Error Handling Improvements
- **standardized** Error handling across the codebase by replacing inconsistent `console.error` calls with `showFailureToast` for better user experience
- **enhanced** Plugin error handling with user-friendly error messages while maintaining debug logging for developers
- **enhanced** Move operations error handling with clear user feedback when operations fail

### TypeScript & Code Quality Fixes
- **fixed** TypeScript errors: corrected `toggleResultPinnedStatus` function calls to use single parameter (result only) instead of two
- **fixed** TypeScript errors: resolved `selectedItemId` type issues by handling null values with `|| undefined`

### Cache & Storage Improvements
- **moved** code to use standard Raycast Cache / Localstorage
- **migrated** Pinned Folders to use localstorage

### Bug Fixes & Performance
- **removed** a lot of code that was causing unnecessary issues with flickering and fallback
- **tested** the fallback issues and they appear fixed now, due to removing debouncing and some other code
- **fixed** search results not showing when there are more than max results

These Bugs should be resolved:
https://github.com/raycast/extensions/issues/19574
https://github.com/raycast/extensions/issues/19187
https://github.com/raycast/extensions/issues/19006

### Plugin Improvements
- **fixed** some bugs with the plugins, added a new plugin to the plugin folder

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

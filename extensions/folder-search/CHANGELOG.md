# Folder Search Changelog

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

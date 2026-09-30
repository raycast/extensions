# Visual Studio Code - Project Manager Changelog

## [Update] - 2025-07-15

- Add preference to hide disabled projects (those with "enabled": false) in the project list.

## [Update] - 2024-07-05

- The extension now uses frecency sorting for the projects list to show the most recently or frequently used projects first in the search results. When searching for a project, exact matches appear earlier in the list than fuzzy-matched results, while respecting the frequent/recent sorting.

## [Fixes] - 2024-04-25

- Fixed a problem with invoking `code` when not present in the Path environment known to Node

## [Update] - 2024-04-23

- Improved error messages when the Projects Location file is invalid or when the extension isn't found in the selected VS Code build.

## [Update] - 2024-03-19

- The extension now supports any variant of VS Code by using an app picker instead of a fixed dropdown list of VS Code builds.

## [Update] - 2023-11-23

- Add support for [Cursor](http://cursor.sh)

## [Update] - 2023-04-24

- Update build identifier for VSCodium. (VSCodium/vscodium#1227)
- Add option for `VSCodium < 1.71` to maintain old build identifier.

## [Update] - 2023-03-30

- Add support for VS Code cached projects.

## [Fixes] - 2023-03-16

- Fixed a problem with the remote path when there is a "." in the path

## [Fixes] - 2023-03-11

- Fixed terminal overrides the default environment variables.

## [Fixes] - 2022-11-25

- This commit filters out duplicate entries

## [Added screenshots] - 2022-11-17

## [Support ssh remote projects] - 2022-08-24

## [Add VSCodium option] - 2022-07-28

## [Add filtering by tag functionality] - 2022-07-27

## [Add preference to hide projects without tag] - 2022-05-01

## [Add VSCode Insiders option] - 2022-04-05

## [Support projects_cache_any.json] - 2022-03-14

## [Add support for Git cached projects] - 2021-11-15

## [Fixes] - 2021-11-04

- Fixes `undefined` property access when checking project tags

## [Add support for open in terminal and Git client] - 2021-11-04

## [Added Visual Studio Code - Project Manager] - 2021-10-28

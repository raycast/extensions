# Visual Studio Code Search Recent Projects Changelog

## [Fix] - 2023-12-27

- Fix crash when there is no `metadata` in an extension manifest

## [Update] - 2023-12-09

- Add `Open New Window` command

## [Update] - 2023-12-06

- Add actions to remove one or all entries from the recent projects list

## [Enhancements] - 2023-12-07

- Added Open and close other windows action

## [Fix] - 2023-11-28

- Hopefully Fix the "Open With Terminal" action by using the bundle identifier and checking that it exists

## [Update] - 2023-11-28

- Add `Open With Terminal` action (only for directories)
- Add command preferences for Terminal app

## [Fix] - 2023-09-22

- Properly support VSCodium and Cursor in for commands relating to extensions

## [Update] - 2023-08-25

- Adds support for Cursor as an option in the extension settings.

## [Fix] - 2023-08-09

- Fixed a bug that caused the extension to crash if wrong build was selected

## [Fixes] - 2023-08-02

- Fix some issues with invalid URLs that cause crashes.

## [Update] - 2023-07-12

- Make it possible to open remote workspaces.

## [Update] - 2023-06-29

- Make it possible to open the currently opened Finder folder on vscode

## [Update] - 2023-06-07

- Add `Show Installed Extensions` command
- Add `Install Extension` command
- Add `Commands` command

## [Update] - 2023-01-31

- Updated pinned projects logic
- Cleaned up file structure
- Restructure components

## [Update] - 2023-01-03

- Adds support for VSCodium as an option in the extension settings.

## [Updates] - 2022-10-13

- Added preference to keep section order. Disabled by default to keep current behavior.

## [Fixes] - 2022-07-03

- Fixed an issue where some characters will display as percentage encoded format.

## [Fixes] - 2022-05-25

- Reverted back to using the VS Code SQLite DB to load recent projects.
- Fixed an issue where only 10 recent projects would load.

## [Updates] - 2022-05-25

- Fixed a bug where it was unable to open project that has space in path
- Fixed so deleted paths are not visible in the list

## [Updates] - 2022-05-23

Adds back the support for remote workspaces that got broken in an earlier fix

## [Updates] - 2022-05-12

Fixed the filter rules

## [Updates] - 2022-05-12

Fixed missing workspaces from previous update.

## [Updates] - 2022-05-09

Adds sqllite db support for recent files/folders which is used from Visual Studio Code v1.65.0.

## [Updates] - 2021-10-13

Fixed show in finder action, and added development actions.

## [Initial Version] - 2021-10-12

Add Search Recent Projects in VS Code extension

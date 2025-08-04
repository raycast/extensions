# Visual Studio Code Changelog

## [Update] - 2025-08-04

- Added support for Kiro.

## [Update] - 2025-03-05

- Added support for Trae CN.

## [Update] - 2025-03-03

- Fixed support for VSCodium - Insiders.
- Sorted the list of builds in alphabetical order within the extension settings.

## [Update] - 2025-03-02

- Adds support for Positron as an option in the extension settings.

## [Performance] - 2025-03-02

- Fixed performance issue in ⁠Search Recent Projects command by implementing caching for application data retrieval. This significantly improves responsiveness when displaying many recent projects and eliminates rendering loop warnings.

## [Improvements] - 2025-02-27

- Improved UI by showing the actual editor name and icon (Windsurf, VSCodium, Cursor, etc.) in both `Search Recent Projects` and `Show Installed Extensions` commands.
- Improved the `Uninstall Extension` action by adopting a destructive style, adding a shortcut, and enhancing the user experience by displaying the extension name in the confirmation dialog.
- Added support for VSCodium - Insiders.

## [Update] - 2025-02-22

- Adds support for Trae as an option in the extension settings.

## [Fix] - 2025-01-02

- Fix the issue where users cannot open a new window when using a language pack.

## [Update] - 2024-12-04

- Adds support to customize the color for git branch tag (default is green). Inspired by [#15693](https://github.com/raycast/extensions/issues/15693).

## [Fix] - 2024-12-05

- Improved error handling for ambiguous git HEAD argument.

## [Update] - 2024-12-02

- Adds support to see Git branch in `Search Recent Projects`. Inspired by [#15626](https://github.com/raycast/extensions/issues/15626).

## [Update] - 2024-11-17

- Adds support for Windsurf as an option in the extension settings.

## [Chore] - 2024-09-02

- Added missing contributor

## [Update] - 2024-05-31

- Add keywords for VSCodium and Cursor

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

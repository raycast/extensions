# Downloads Manager Changelog

## [Add file preview] - 2026-02-25

- Added file preview in Manage Downloads: image previews (macOS only) and metadata for downloaded files.
- Added utility functions for Quick Look previews on macOS (using ql-manage).
- Added pagination for Manage Downloads to combat OOM crashes
- Added preference for toggling the preview image
- Made action preferences persist using cached states
- Added shortcut for toggling metadata view
- Added sub-directory navigation

## [AI tools] - 2025-12-25

- Added the `Get Latest Download` tool to get the path of the latest download with Raycast AI.
- Added the `Copy Latest Download` tool to copy the latest download with Raycast AI.
- Added the `Delete Latest Download` tool to delete latest download with Raycast AI.
- Added the `Open Latest Download` tool to open the latest download with Raycast AI.
- Added the `Paste Latest Download` tool to paste the latest download into the currently opened window with Raycast AI.
- Added the `Show Latest Download` tool highlight the latest download in the downloads folder with Raycast AI.

## [Add Windows support] - 2025-12-19

- Added support for Windows

## [Fixes] - 2025-12-10

- Fixes [#23514](https://github.com/raycast/extensions/issues/23514)
- Updated dependencies

## [Add Grid layout] - 2025-12-01

- Added a Grid layout to the Manage Downloads command. Comes with an Action to toggle between layouts as well as a Preference for setting the default layout

## [Add delete last downloaded item command] - 2025-06-03

- Added the command `Delete Latest Download`, which deletes the latest download.

## [Add new commands] - 2025-05-22

- Added the command `Paste Latest Download`, which pastes the latest download to the foremost active app.

## [Add reload action] - 2025-05-07

- Added a reload action to fetch the latest downloads in the `Manage Downloads` command.

## [Enhancement] - 2025-02-25

- Updated the `Show Latest Download` command to display the most recent download file.

## [Add file order preference] - 2025-01-07

- Added a preference to sort files by added, modified, or created time in the `Manage Downloads` command.

## [Add show hidden files preference] - 2024-12-22

- Added a preference to show hidden files in the `Manage Downloads` command

## [Add close window script] - 2024-10-29

- Added a script to close the window to ensure it closes after the action is completed

## [Check Permission] - 2023-06-21

- Added a check for access to the configured Downloads folder

## [Add new action] - 2023-03-30

- Added the action `Copy File` for the `Manage Downloads` command

## [New preference] - 2023-01-23

- Added quick look to `Manage Downloads` command
- Added preference to customize downloads folder

## [Add new commands] - 2022-10-08

- Added the command `Copy Latest Download`, which copies the latest download to the clipboard.
- Added the command `Show Latest Download`, which reveals the latest download in Finder.

## [Initial Version] - 2022-08-22

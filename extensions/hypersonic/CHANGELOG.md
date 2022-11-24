# Hypersonic Changelog

## [1.0.0] - 2022-11-21

- Update Raycast to "@raycast/api": "1.44.0",
- Update Raycast to "@raycast/utils": "1.4.11"
- Added Fuse to improve the creation of todos with tags, projects, assignees
- Added chrono-node to improve the creation of todos with due dates
- Added support for multiple database relationships
- New preferences configurator to facilitate the database connection
- New multi filter option to filter todos by projects, tags and assignees
- Updated actions commands for easy access to the new features
- Replaced snooze command with a new due date command
- Deprecated move command
- Updated menu bar command to work with the new features
- Included Notion logo in Notion related commands
- Added instant refresh to menu bar command through launchCommand method
- Updated menu bar extensions background fetch time from 1 minute to 5 minutes
- Added share task command
- Logo update

## [0.0.3] - 2022-09-15

- Update Raycast to "@raycast/api": "1.39.2"
- Update Raycast to "@raycast/utils": "1.4.0"
- Update Notion to "@notionhq/client": "2.2.0"
- Major refactor of the code using the new useCachedPromise hook.
- Added support for custom properties database names.
- Added support to complete tasks using the new status property from notion.
- Added support for In progress status when using the new status property.
- Better integration with notion fetching todos created directly from there without date and name.
- Change authorize command to `cmd + shift + A`.
- New menu bar command to interact with your todos and background fetching

## [0.0.2] - 2022-07-15

- Added custom reminder. Now You can set custom reminder for each task.
- Added filter by label.
- Added `undo` command for undoing last mark as completed todo action.
- Changed todo's sorting order.
- Remapping the columns. Now you can change the columns names in order to implement `Hypersonic` with your databases. You can change the columns names with the `cmd + ,`.

## [0.0.1] - 2022-07-01

- Changed the `openExtensionPreferences` to `openCommandPreferences` action, in order to get the extension selection on list.

## [Initial Version] - 2022-06-10

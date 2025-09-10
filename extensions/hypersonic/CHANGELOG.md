# Hypersonic Changelog

## [2.1.2] - {PR_MERGE_DATE}

#### Updated

- Improved task status management for better organization and ease of use across the extension.
- Centralized task status definitions and icons for easier maintenance.
- Refined the logic for status updates to enhance stability.

## [2.1.1] - 2025-08-04

#### New

- Added an option to update the title of a task

#### Updated

- Moved all icon files to assets/icons/ for better organization

## [2.1.0] - 2024-04-29

#### New

- Use `/` to set the status for a new TODO item during creation

## [2.0.5] - 2024-02-13

### Updated

- Fixed a bug that caused extension to crash if menu bar action was disabled

## [2.0.4] - 2023-09-04

#### Updated

- Fixed a bug that caused the extension to crash if menubar command was used while the token was expired

## [2.0.3] - 2023-01-23

#### Updated

- Fixed a bug where users couldn't create tasks when the status property was set to the checkbox type.
- Improved stability when fetching tasks by adding a new message alert that enables users to restart the database connection if needed.

#### New

- Set status action to mark a task with every status available in notion.
- Segmented todo list to show tasks with different statuses.
- Filter by status action to filter tasks by status.

#### Updated

- Improved date picker.

## [2.0.2] - 2022-12-23

#### New

- Url optional parameter that lets users attach a url to a task and open it whenever they want.

#### Updated

- Tag style with the new tag property from raycast.

## [2.0.1] - 2022-12-08

#### New

- Added an action that lets users share a task after creating it.
- Added an action that lets users to open a task after creating it.

#### Updated

- Changed toast feedback to hud feedback after a successful work sharing action.
- Fixed a bug that caused the extension to crash when the assigned user didn't exist in the workspace.
- Fixed a bug that caused the database fetch to crash when a database lacked a title property.

## [2.0.0] - 2022-12-01

#### New

- You can now create todos with natural language. Including tags, projects, assignees.
- Support for multiple database relationships.
- Database settings view to improve set up.
- Combine filters by projects, tags and assignees.
- Added instant refresh to menu bar command.
- Copy Task URL action.
- Mark as not started action.
- Add Project to a task action.
- Assign user to a task action.

#### Updated

- Modify task date using natural language.
- Replaced 'Remind me' action for 'Due Date'.
- Menu bar command to work with filters.
- Menu bar command background fetch time from 1 to 5 minutes.
- Share your work action to work with filters.
- Conditional Open detail action if Notion is installed.
- Conditional Open Notion database action if Notion is installed.
- Hypersonic icon.

#### Deprecated

- Move command

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

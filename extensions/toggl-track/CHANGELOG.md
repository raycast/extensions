# Toggl Track Changelog

## [Enhancements] - 2024-03-06

- Add workspace and project fields to time entry form.

## [Enhancements] - 2024-02-27

- Show tags, project, and client on time entries.

## [Bug Fixes] - 2024-02-21

- Update the `project` from in `CreateTimeEntryFrom` when projects are changed.
- Fix list item accessory for time entries' projects.

## [New Feature] - 2024-01-16

- Adds a new `Manage Tags` command.
- Adds a new `Manage Projects` command.
- Adds a new `Manage Clients` command.
- Adds a new `View Projects` command.

## [Enhancements] - 2024-01-16

- Rename main command to "Start/Stop Time Entry".
- Remove projects from list view.

## [Bug Fixes] - 2024-01-15

- Remove `refresh` action.
- Fix project dropdown in time entry form.
- Fix today's duration timer.

## [Refactor] - 2024-01-04

- Refactor extension to use updated Raycast utilities.

## [New Feature] - 2023-02-28

- Add ability to choose a [project task](https://support.toggl.com/en/articles/2220738-tasks) when creating a new time entry.

## [Enhancements] - 2023-07-05

- New preference that allows archived projects to be hidden (default: true).

## [New Feature] - 2023-02-28

- Display the total time tracking in the current today in the main windows navigation title.

## [Update] - 2023-02-13

- Enhanced call to fetch all workspace projects to retrieve 500 instead of default page size introduced in API v9

## [Update] - 2023-02-07

- Upgrade to Toggl API v9

## [Enhancements] - 2023-01-27

- Sort time entries starting from latest

## [New Feature] - 2022-10-20

- Add a manual refresh action to command's main window.

## [New Feature] - 2022-05-23

- Add billing support to the Toggl Track extension. Added the ability to toggle whether a new task is billable or not, as well as indicators to entries. The billable toggle only shows up if the project selected is billable (as determined by the track API)

## [New Feature] - 2022-05-12

- Add ability to filter by client name for projects

## [Initial Release] - 2022-01-27

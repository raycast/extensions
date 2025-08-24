# Toggl Track Changelog

## [Enhancements] - 2025-04-23

- Add preferences to select the history lookback window

## [Enhancements] - 2025-03-17

- Add preferences to show/hide clients, projects, tasks, and tags in the time entry form

## [New Feature] - 2025-02-05

- Add ability to update time entry start and stop date
- Add ability to change the start time for a running time entry

## [New Feature] - 2025-12-12

- Add shortcut to "Create Similar Time Entry"

## [New Feature] - 2024-12-09

- Add "Update Time Entry" command to update time entries
- Add ability to update time entry action from the list

## [New Feature] - 2024-10-07

- Add ability to create task for time entry form

## [Bug Fixes] - 2024-08-20

- Remove seconds from optional timer in the Menu Bar, as it only updates every 10 seconds.

## [Bug Fixes] - 2024-08-02

- Resolve issue when stopping a running time entry doesn't work

## [Bug Fixes] - 2024-07-31

- Do not show currently running time entry in the recent time entries list
- Fix running time entries not showing project details
- Fix no clients, projects, tasks on create new time entry form, if there is no selected workspace

## [New Feature] - 2024-07-29

- Add ability to view, start, or stop existing time entries from the Menu Bar

## [Enhancements] - 2024-07-29

- Add ability to set billable in new entry form
- Add ability to delete entry from list

## [Enhancements] - 2024-05-27

- Prettier sort imports
- Absolute paths in imports

## [Enhancements] - 2024-05-17

- Add ability to prefill form of new entry with actual selected entry

## [Bug Fixes] - 2024-03-25

- Fix time entries refresh

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

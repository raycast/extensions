# Linear Changelog

## [Added right click support to menubar] - 2022-12-05

- Added right click support to menubar which mark the issue as read.

## [Copy Formatted Issue URL Action] - 2022-12-23

- Add a new "Copy Formatted Issue URL" Action

## [Add all teams option in "Search Projects" command] - 2022-11-21

- Add an `All teams` option in `Search Projects` command allowing users to see all projects in a Linear workspace

## [Create issue customization] - 2022-10-13

- Add a preference to select the toast copy action after creating the issue
- Add a preference to automatically the title field or not
- Fix a bug where the sections were not ordered when searching
- Refactor the project and issue edition to use `useForm`

## [Support emojis for projects] - 2022-09-20

- Add support for emojis in projects

## [Various improvements] - 2022-08-11

- Add "Add Comment" action from the issue list
- Support project updates notifications
- Refactor how all states are retrieved in "Active Cycle", "Created Issues", "Assigned Issues" commands, and project issues.
- Update Raycast dependencies

## [Fix issue creation when there's only one team] - 2022-07-27

Fix an issue where it wasn't possible to create an issue if the user only has one team in their workspace.

## [Comment improvements] - 2022-07-26

- Add the ability to add/edit a comment
- Add an empty screen if there are no comments for a given issue
- Add a warning before deleting a comment

## [New commands and open sourced] - 2022-07-21

Introduce "Notifications" and "Create Project" commands to the Linear extension.

The extension is now open source and its source can be found in the `raycast/extension` repository.

## [Added Search Projects command] - 2022-02-23

Introduced Search Projects command to the Linear extension.

## [Added Extension to Store] - 2021-11-30

Linear added to the Raycast Store.

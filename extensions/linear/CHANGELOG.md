# Linear Changelog

## [Add "Break Issue Into Sub-Issues" action] - 2023-05-09

Thanks to AI, the Linear extension has a new issue action: `Break Issue Into Sub-Issues`. It takes the issue title and description as context and generates actionable sub-issues that you can choose to create or not.

## [Set title field as default in Create Issue command] - 2023-05-02

Previously, the `Team` field was the default one when the user had more than one team in the `Create Issue` command. Since users often add issues to the same team, let's make the `Title` field the default.

## [Remove Raycast signature] - 2023-04-19

- Remove Raycast signature preference from the `Create Issue` command

## [Add multiple attachments when creating an issue] - 2023-02-28

- Add support for multiple attachments in the `Create Issue` command
- Fixed a bug where the title form field was not focused if the teams field was hidden.

## [Add support for roadmaps] - 2023-02-23

- Add roadmaps dropdown in `Search Projects` command
- Add target date and teams accessories in `Search Projects` command

## [Adjust colors contrast in light mode] - 2023-02-08

- Adjust color contrast on icons so that they're more visible in light mode

## [Add attachment to Create Issue command] - 2023-01-24

- Add a file picker on the `Create Issue` command to add a single attachment on a newly created Linear issue

## [Add due date action] - 2023-01-19

- Add a new action to set due dates on issues
- Add due date accessory on issue list items

## [Quick Add Comment to Issue command] - 2023-01-18

- Add a new command allowing you to quickly add a comment to an issue using its issue ID.

## [Fix icons] - 2022-12-20

- Fix a bug where Linear icons would not show up in the list's accessories for projects
- Fix a bug where Linear icons would not show up if the corresponding icon in the file system doesn't exist
- Add new predefined icons

## [Add new accessories in issue list] - 2022-12-12

- Add cycle, project, label, and estimate accessories in the issue list if any

## [Added right click support to menubar] - 2022-12-05

- Added right click support to menubar which mark the issue as read.

## [Copy Formatted Issue URL Action] - 2022-11-23

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

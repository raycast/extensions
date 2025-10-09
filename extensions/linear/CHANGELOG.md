# Linear Changelog

## [Status Preference] - 2025-10-09

- Added "Preferred Status" preference to "Create Issue for Myself" command to specify the initial status for new issues

## [Update API and bug fixes] - 2025-04-15

- Updated dependencies
- Fix project statuses bug in AI Extension

## [Fix Search Issue] - 2025-03-11

- Updated getIssues to use the new searchIssues API instead of issueSearch ( now deprecated )

## [Fix Creation Issue] - 2025-02-25

- Fixed issue creation with stateId because of closing quote in the GraphQL mutation.
- Added npm run publish to publish the extension to the Raycast Store as per [Docs](https://developers.raycast.com/basics/publish-an-extension).

## [✨ AI Enhancements] - 2025-02-21

## [Focus Shortcuts] - 2025-02-07

- Added input focus sub-commands to the `Create Issue` command for changing the focused form input quicker.

## [Search Projects Fixes] - 2024-11-08

- [#15052](https://github.com/raycast/extensions/issues/15052): Fixed incomplete project list by adding pagination and utilizing search text to fetch projects directly.

## [Search Projects Fixes] - 2024-08-08

- [#13882](https://github.com/raycast/extensions/issues/13882): Replaced filtering on roadmaps with filtering on initiatives, as initiatives replaced roadmaps.
- Made Delete Project action alert destructive and added a retry option in case of errors.

## [Documents and Issues Fixes] - 2024-07-25

- Create Issue: Fixed issue that made projects, cycles, estimates, etc. disappear in the form after consecutive issue creation.
- Issue Actions: Standardized the issue deletion shortcut.
- Documents: Moving documents action does not show the current entity and removed delete action from Document Detail view.

## [Document Support] - 2024-07-18

- New "Search Documents" command to search documents across Linear projects and initiatives. Supports typeahead if there are too many docs.
- New action "Show Project Documents" to look up project documents.

## [Fixes] - 2024-07-08

- [#10856](https://github.com/raycast/extensions/issues/10856): Typeahead search for teams while creating/editing issues and in active cycles command. Typeahead is only triggered if no. of teams is > 50.
- [#8704](https://github.com/raycast/extensions/issues/8704): Typeahead search for users/assignees/leads in various actions and commands, getting rid of missing assignees issue. Typeahead is only triggered if no. of users is > 50.
- [#13194](https://github.com/raycast/extensions/issues/13194): Feature to add links while creating issues and ad-hoc action to add attachments and links while viewing issues.
- The order of teams in "Create issue" respects the order of teams in the Linear native application.
- When using "Create issue for myself" without specifying a preferred team in settings, use first team from the sorted array of teams.

## [Improved Notifications] - 2024-06-14

- Added support for all types of notifications, ensuring that "Unknown Notification" no longer appear.

## [Project Improvements] - 2024-06-11

- Added support for all the latest Linear icons.
- Introduced a new "See Project Updates" action.

## [Action Shortcut] - 2024-06-10

- Added a new shortcut in the Search Projects command: Press Cmd + Enter to open a project in Linear.

## [Improvements] - 2024-05-30

- Added preference to hide redundant (Done, Canceled, Duplicate) issues across all searches

## [Bug Fixes] - 2024-05-25

- Fixed milestones to be updated with "Create Issue" command

## [Improvements] - 2024-05-14

- Notifications now support Projects (Updates, comments, reactions, added as member), Document Mentions and Bots (GitHub and GitLab)
- Updated Project Icons

## [Added two new actions] - 2024-05-10

- Added two new toast actions: `Copy Issue ID as Link` and `Copy Issue Title as Link`

## [Fix missing icons] - 2024-05-01

- Update missing Linear icons

## [Improvements] - 2024-04-29

- Add pagination when searching issues
- Rename "Assigned Issues" to "My Issues"

## [New icons] - 2024-04-26

- Use new Linear icons

## [Fix Creating issue with milestone] - 2024-04-23

- Fix defining `milestoneId` in payload.

## [Enhanced Notifications] - 2024-03-12

- Notifications now include links to comments, project updates, and projects, making it easier to navigate directly to the relevant content in Linear.
- You can now copy the URL of a notification's related item directly from the notification panel.

## [Improve Notifications search] - 2024-03-01

- It's possible to search your notifications by issue identifiers, issue titles, or usernames.

## [Fix images in issues] - 2024-02-02

- Images are now properly loaded when looking at the details of an issue.

## [Use OAuth utils] - 2024-02-01

- Use new OAuth utils

## [Fix projects search not working] - 2024-01-30

- The projects search was not working in case there were no roadmaps available. This is now fixed.

## [Add Favorites command] - 2024-01-05

- Add `Favorites` command to browse your Linear favorites right from Raycast.

## [Add issue links] - 2023-12-29

- Add support for issue links. It is now possible to see the number of links an issue has from the detail view. You can also browse them in a dedicated view.

## [Mark notification as read without opening it] - 2023-11-16

- You can now mark notification as read in the menu bar without opening the notification by pressing `⌥` and clicking the notification.

## [Include team key as keyword in Create Issue command] - 2023-09-22

Added the team key as a keyword in the "Create Issue" function so that it will appear when the user searches for a key.

## [Fix] - 2023-08-23

Fixed "Workflow state not in same team as issue" error for Break Issue into Sub-issues error.

## [Add milestone functionality] - 2023-08-16

Linear now allows users to create milestones within projects. This feature is now available on this extension.

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

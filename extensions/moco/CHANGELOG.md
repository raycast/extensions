# MOCO Changelog

## [Timer Defaults and Jira Integration] - {PR_MERGE_DATE}

- Added default projects/services and Jira project rules in MOCO Settings by @lenda-arcs.
- Added opt-in Jira ticket detection from Safari and Chromium browsers to Start New Timer by @lenda-arcs.
- Added native Jira links and previous recorded ticket time, with a compact timer form and refresh action by @lenda-arcs.
- Fixed a failed activity refresh keeping a successfully saved timer form open by @lenda-arcs.
- Updated the Raycast SDK and supporting dependencies by @lenda-arcs.

## [v1.2.0] - 2026-10-15

- Added today's total time and timer controls to the menu bar by @TheFRedFox
- Added favorites, a "Today" list (add, edit and delete activities) and task actions to the menu bar by @TheFRedFox
- Added the "Start New Timer" and "Edit Current / Last Active Timer" commands by @TheFRedFox
- Added favorites management and settings to the menu bar by @TheFRedFox
- Added validation to the start and edit forms by @TheFRedFox
- Fixed "Hide Project" marking projects as favorites by @TheFRedFox
- Fixed the API key being written to the log by @TheFRedFox
- Fixed dates using UTC instead of local time, which could book the previous day around midnight by @TheFRedFox
- Fixed deleting an activity being reported as failed although it was deleted, and ask before deleting by @TheFRedFox

## [v1.1.4] - 2026-08-17

- Fixed malformed API base URLs

## [v1.1.3] - 2025-12-12
 - Added copy actions for project name and ID by @el-schneider

## [v1.1.2] - 2023-06-28
 - Made the Hourly Rate field optional by @TheFRedFox
 - Fixed Spelling error in activity start error message by @TheFRedFox

## [v1.1.1] - 2023-04-05
- Hours worked can now be entered in a non decimal way reliably

## [Initial Version] - 2023-02-23
- Initial release with basic functionality

# Changelog

## [Restore Jira Cloud Search and Manage Worklogs] - {PR_MERGE_DATE}

- Restore Jira Cloud issue search using the enhanced JQL endpoint and cursor pagination, while retaining Jira Server support.
- Add View Logged Time with monthly totals, hour and text filters, and reminders for weekdays below the configured daily threshold.
- Add actions to edit, delete, and log more time, with the selected day prefilled and totals refreshed after changes.
- Load every issue and worklog page, include weekend entries in totals, and surface failed requests instead of showing incomplete totals.
- Preserve rich-text comments when editing only time or date, validate complete duration inputs, and fix project selection during loading.

## [Custom JQL and Default Project Preference] - 2024-12-05

- Removed Only My Issues preference.
- Added a new Custom JQL Query preference to allow flexible issue filtering.
- Added a Default Project Key preference to preselect a default project.
- Enhanced getIssues and getProjects to utilize new preferences.
- Fixed handleProjectResp by integrating projectsValidator to ensure type safety and proper handling of Jira API response versions.

## [Only My Issues Preference] - 2024-11-27

- Added a new preference `Only My Issues` to filter issues assigned to the provided Jira username.
- Updated `getIssues` functionality to use the `username` preference for filtering.

## [Jira Server Support] - 2024-06-17

- Now supports both Jira Server and Jira Cloud instances.
- Updated time logging UI/UX for faster/more Raycast-like user experience.

## [Pagination Support] - 2024-01-26

- Support load all projects/issues with Jira pagination API.

## [Initial Release] - 2022-04-26

- Released first version of Jira Time Tracking

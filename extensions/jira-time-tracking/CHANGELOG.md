# Changelog

## [Atlassian API Migration] - 2025-11-02

- Migrated from deprecated `/rest/api/3/search` endpoint to new `/rest/api/3/search/jql` endpoint for Jira Cloud instances.
- Updated pagination from offset-based (`startAt`) to cursor-based (`nextPageToken`) for Jira Cloud.
- Maintained backward compatibility with Jira Server instances (still using `/rest/api/2/search`).
- Fixed extension compatibility with Atlassian's API deprecation schedule (deprecated endpoints removed after October 31, 2025).

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

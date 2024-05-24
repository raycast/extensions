# Jira Changelog

## [The custom fields can be render as required] - 2024-05-16

- Fixed an issue where the custom fields were not recognized as required, even though the API suggested they were.

## [Fix Open in Browser action] - 2024-05-16

- Fixed an issue where users who logged in using an API token were unable to open issues directly in their web browser.

## [Show target status on Change Status submenu] - 2024-04-30

- Show target status next to the action name on Change Status submenu

## [API token bug fixes] - 2024-04-22

- Improved handling of invalid URLs in the jiraWithApiToken function
- Changed to using hostname instead of full URL in jiraCredentials to avoid potential errors

## [Add option to authenticate using API token] - 2023-03-27

- Add option to authenticate using token for REST APIs
- Add preferences for the same

## [Improve Assignee and Sprint dropdowns] - 2024-03-14

- Remove the default value in the Assignee and Sprint dropdowns when searching.

## [Add OAuth utils] - 2024-02-13

- Use new OAuth utils

## [Add command to open issue from clipboard] - 2024-01-19

- Add a new command to open issue by key from the clipboard.

## [Fix issue with JQL reserved keywords in project names] - 2023-12-18

- Fix a bug causing queries to fail when project names included JQL reserved keywords.

## [Fix bug with loading Create Issue panel with extensive metadata] - 2023-11-19

- Fix an issue with issue creation where large amounts of issue metadata could cause out-of-memory errors during loading.

## [Add watching functionality to issue actions] - 2023-11-19

- Add start/stop watching issue action.

## [Add project list in Search Issues command] - 2023-10-06

- It is now possible to filter issues by projects in the `Search Issues` command. If a project is selected, you can simply input the ticket number in the search query for faster results.

## [Implement Comments on issues] - 2023-10-03

- Add list of comments
- Add new comment action
- Add edit comment action
- Add delete comment action

## [Render authenticated image URIs] - 2023-09-10

- Now successfully renders images and icons that require authenticated HTTP requests

## [Fix searching for sprints] - 2023-09-06

- Fixes an issue where searching for sprints would fail if the start date is not defined.

## [Create Issue shortcut at the lists of issues] - 2023-07-19

- Now allows user to open create issue command via shortcut from the lists of issues

## [Type before credentials load] - 2023-07-05

- Now allows user to start typing before the credentials are loaded

## [Persist Active Sprint Project value when closing command] - 2023-06-28

- Persist Active Sprint Project value when closing command allowing the command to fetch the issues for the latest selected project when opening the command anew.

## [Bug fixes] - 2023-06-15

- Fixed a bug where a user's or project's avatar URL could not be displayed.
- Fixed rendering failures (`Missing required property "title" for Unknown`).

## [Bug fixes] - 2023-06-12

- Fixed a bug where `Show Details` would show up on the issue's detail view.

## [Fix missing error title] - 2023-05-09

Statuses in Jira may not have categories. Problem is, these categories are used as a section title in various commands such as `Open Issues` causing the error:

```
Error: Rendering failed:
Missing required component property "title"
```

This should be fixed now!

## [Remove Raycast signature] - 2023-04-19

- Remove Raycast signature preference from the `Create Issue` command

## [Fix persisted values] - 2023-04-18

- Fix an issue where the filter dropdown or the active sprint dropdown wouldn't save the selected dropdown value.

## [Fix priority issue] - 2023-04-13

- Fix an issue where priorities could be unset, causing the loading of issues to fail.

## [Support tables] - 2023-04-12

- Support tables in Jira following Markdown additions in v1.49.3 release

## [Implement Search Suggestions for Filters and Projects] - 2023-04-03

- Add typeahead search for filter dropdowns
- Fix duplicated values in filter dropdowns
- Add typeahead search for project dropdowns

## [Various fixes and improvements] - 2023-03-09

- Make issue types and auto-complete URLs optional
- Add support for auto-completing in the Assignee field
- Add a default value for priorities
- Sort sprints to show active sprints first, then future ones, then closed ones.

## [Initial Version] - 2023-02-27

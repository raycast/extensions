# Jira Changelog

## [Add project list in Search Issues command] - 2023-10-06

It is now possible to filter issues by projects in the `Search Issues` command. If a project is selected, you can simply input the ticket number in the search query for faster results.

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

- Persist Active Sprint Project value when closing command allowing the command to
  fetch the issues for the latest selected project when opening the command anew.

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

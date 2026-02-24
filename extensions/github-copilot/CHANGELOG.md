# GitHub Copilot Changelog

## [Fix copilot quota 100% cap] - 2026-02-24

- Fix Copilot quota cap at 100% when user has used all of their quota and have the "Allow usage beyond quota" setting enabled

## [Fix search-repositories AI tool] - 2026-02-09

- Fix search-repositories AI tool crash

## [Premium requests on view tasks] - 2026-02-08

- Add premium requests used to the "View Tasks" command

## [Fix titles and URLs for tasks without a pull request] - 2026-02-06

- Fix titles and URLs for tasks without a pull request in "View Tasks" command

## [Additional instructions for issue assignment] - 2026-02-06

- Add optional "Additional Instructions" field when assigning an issue to Copilot

## [Switch extension to use new API] - 2026-02-06

- Switch "Create Task", "View Tasks" and "Menu Bar Tasks" commands to use new API

## [Open workflow run] - 2026-02-03

- Add "Open workflow run" menu item to the "View Tasks" command

## [Assign Issue to Copilot] - 2026-02-03

- Add "Assign Issue to Copilot" command

## [Manage Paid Premium Requests action] - 2026-02-02

- Add "Manage Paid Premium Requests" action to the "Copilot Usage" command
- Fix title casing for "Log Out" action

## [Copilot usage auth] - 2026-02-01

- Fix auth for Copilot usage command using existing OAuth
- Remove apps.json preference (no longer needed)

## [Menu bar command] - 2026-01-09

- Hide the menu bar command when there are no open pull requests

## [Model picker, custom agents and more] - 2025-12-08

- Allow selecting a model when creating a task (Copilot Pro and Pro+ users only)
- Allow selecting a custom agent when creating a task
- When opening a task, launch mission control by default, not the pull request

## [Copilot usage] - 2025-12-01

- Add a command to view GitHub Copilot usage details

## [Refactor data loading] - 2025-09-12

- Load pull request data using the pull request ID returned from the GitHub API

## [Menu bar command, new icons and more] - 2025-09-08

- Add menu bar command for tracking agent tasks
- Update icons in "View Tasks" command to match GitHub.com
- Add "Log out" action to "Start Task" and "View Task" command
- Improve error handling for errors returned by GitHub
- Improve handling of uninitialized repositories with no branches and no commits (see https://github.com/raycast/extensions/issues/21379)
- Clear recently used repositories list when logging out

## [Improved error handling] - 2025-09-02

Add improved error handling when Copilot coding agent is not available for the user (see https://github.com/raycast/extensions/issues/21283) and tasks linked to a deleted repository (see https://github.com/raycast/extensions/issues/21237)

## [AI Extension] - 2025-08-29

Turn the extension into an AI extension with tools for creating tasks and searching repositories. So you can simply `@github-copilot` in Raycast to create a task with natural language.

## [Initial Version] - 2025-08-28

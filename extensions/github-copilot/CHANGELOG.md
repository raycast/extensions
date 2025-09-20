# GitHub Copilot Changelog

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

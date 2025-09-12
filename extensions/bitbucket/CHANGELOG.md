# Bitbucket Changelog

## [Update] - {PR_MERGE_DATE}

- Swap to API tokens, as App Passwords are no longer supported by Bitbucket.
- Change endpoint used for getting my open pull requests (as the previous one didn't support API tokens)

## [Maintenance] - 2025-06-18

- Use the npm official registry
- Bump all dependencies to the latest

## [Update] - 2025-04-04

- Added the ability to favorite repositories

## [Update] - 2024-12-02

- Added Prettier to the project as newly required by Raycast

## [Update] - 2024-06-19

- Changed the show pipelines action's hotkey from "CMD + P" to "CMD + SHIFT + P" to avoid the conflict with the default system print shortcut.

- Fixed the rendering bug for pipelines in progress.

## [Update] - 2023-01-03

- Changed the SearchList implementation to work with workspaces with large number of repositories

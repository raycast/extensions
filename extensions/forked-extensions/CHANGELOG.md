# Raycast Fork Extensions Changelog

## [Bugfix] - {PR_MERGE_DATE}

- Fix the GitHub OAuth permission scope to include `repo` and `workflow`
- Add the missing "Sync Fork" action to the forked extensions list
- Add support for re-authorizing GitHub OAuth token when it is invalid or expired
- Add support for checking if Git is installed and prompt users to set up the Git executable file path in the extension preferences

## [Bugfix] - 2025-08-26

- Fix the missing syncing of the forked repository with upstream repository on GitHub

## [Maintenance] - 2025-08-26

- Add support for Windows
- Polish code formatting and structure
- Change the default fork destination to `~/.config/raycast/forked-extensions`
- Use GitHub API to get user's forked repository
- Allow users to select Git remote type
- Setup the upstream repository automatically
- Add support for syncing the forked repository
- Add a new action to show the repository in Finder
- Add TSDoc comments to some functions
- Bump all dependencies to the latest

## [Initial Version] - 2025-08-20

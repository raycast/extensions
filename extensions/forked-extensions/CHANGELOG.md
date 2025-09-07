# Raycast Fork Extensions Changelog

## [Improvements] - 2025-09-02

- Rename the "Sync Fork" action to "Sync Remote"
- Add a new "Pull Changes" action to allow users to sync commits from remote forked repository
- Add support for inspecting commits difference in "Run Diagnostics" action
- Polish readme with more details about the extension's features and usage

## [Bugfixes] - 2025-09-01

- Fix the missing sparse-checkout-add action when the repository is synced
- Add a toast message when forking an extension when the repository is outdated

## [Improvements] - 2025-09-01

- Improve error handling by creating a "catchError" utility function to avoid running rest of the code when an error occurs
- Use a workaround to fix the issue that the "Toast" instance cannot set the "primaryAction.onAction" for some unknown reason
- Fix a wording issue in the "Sync Fork" action title
- Cleanup the redundant "openExtensionPreferences" when Git not found
- Add a new "Diagnostics" action to help users diagnose common issues
- Fix "Sync Anyway" action not working when forking an extension
- Replace all code backticks with double quotes due to Raycast store page cannot display it in good visual
- Improve the description for "GitHub Personal Access Token" preference
- Bump all dependencies to the latest

## [Bugfixes & Enhancements] - 2025-08-27

- Re-organize the error handlers
- Fix the "Sync Fork" action cannot rerendered after syncing the forked repository
- Create a customized "showFailureToast" function to consume with the singleton toast instance
- Fix the Git executable file path which contains spaces cannot be recognized on Windows
- Change the "gitExecutableFilePath" preference field to "textfield" due to the "file" cannot be cleared from the UI
- Check if the sync state is outdated before syncing the forked repository

## [Bugfix] - 2025-08-27

- Fix the GitHub OAuth permission scope to include "repo" and "workflow"
- Add the missing "Sync Fork" action to the forked extensions list
- Add support for re-authorizing GitHub OAuth token when it is invalid or expired
- Add support for checking if Git is installed and prompt users to set up the Git executable file path in the extension preferences

## [Bugfix] - 2025-08-26

- Fix the missing syncing of the forked repository with upstream repository on GitHub

## [Maintenance] - 2025-08-26

- Add support for Windows
- Polish code formatting and structure
- Change the default fork destination to "~/.config/raycast/forked-extensions"
- Use GitHub API to get user's forked repository
- Allow users to select Git remote type
- Setup the upstream repository automatically
- Add support for syncing the forked repository
- Add a new action to show the repository in Finder
- Add TSDoc comments to some functions
- Bump all dependencies to the latest

## [Initial Version] - 2025-08-20

# Forked Extensions

The extension for helping you manage your forked Raycast extensions.

## Principles

This extension leverages the [Git sparse-checkout](https://git-scm.com/docs/git-sparse-checkout) feature to efficiently manage your forked extensions. Our goal is to eliminate the need for cloning the entire repository, which can exceed 20 GB in size, by enabling sparse-checkout. With this extension, you can forgo Ray CLI's `⁠pull-contributions` and `⁠publish` commands, allowing you to use Git commands directly for managing your extensions.

## Requirements

- [Git](https://git-scm.com) installed on your system

## Features

- [x] Explorer full extension list
- [x] Sparse-checkout an extension
- [x] Remove an extension from forked list
- [x] Synchronizes the forked repository with the upstream repository on local

## GitHub Permission Scopes

This extension requires the following GitHub API permission scopes:

- `repo`
  - `api.repositoryExists()` - Checks if the user's forked repository exists
  - `api.getForkedRepository()` - Retrieves the full name of the user's forked repository
  - `api.compareTwoCommits()` - Compares two commits in the user's forked repository
- `workflow`
  - `api.syncFork()` - Syncs the forked repository with the upstream repository on GitHub

## Hint

You can always open your forked extension folder in the terminal to work with CLI commands directly.

## License

MIT

# Gitea Changelog

## [Improved Browsing and Notifications] - 2026-06-19

### New Features

- Search issues from repositories -- Repository actions now include Search Issues, opening issue search scoped to the selected repository with `repo:owner/name` query syntax.
- Add a clone protocol preference for clone-with-editor actions, with HTTPS and SSH options.
- Add an optional My Pull Requests category for all accessible repositories while preserving owned-repository filtering by default

### Improvements

- Repository commands now use server-side search and sorting
- Improve issue creation by validating selected labels, milestones, and assignees before submission
- Improve notification actions, menu bar refresh behavior, and links to the latest notification comment

### Fixed

- Keep issue creation usable when some repository metadata cannot be loaded, with clearer failure messages
- Show more detailed Gitea API errors across repository, issue, pull request, user, and notification requests

## [Added Gitea] - 2026-06-04

Initial release of the Gitea extension for Raycast.

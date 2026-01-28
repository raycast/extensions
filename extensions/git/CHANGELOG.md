# Changelog

## [Update] - 2026-01-21

### Added
- **Commands**: Add "Open Last Visited Git Repository" command
- **Repository Navigation**: Add "Switch Repository" action
  - Introduce `SwitchRepositoryAction` component with keyboard shortcut (Ctrl+R)
  - Enable quick switching between repositories without leaving the current view

### Changed
- **Commits**: Improve error handling in `useGitCommits` hook
  - Add try-catch block to prevent crashes when fetching commits fails
  - Return empty data gracefully on errors instead of throwing exceptions

## [Update] - 2026-01-17

### Added
- **Remotes**: Add submenu for remote links and pages
  - Introduce `RepositoryAttachedLinksAction` submenu
  - Enhance `RemoteWebPageAction.Base` to show remote title
  - Expand host-specific web page links for GitHub, GitLab, Gitea, Bitbucket, and Azure DevOps
- **Manage Repositories**: Add "Delete Folder" action for repository directories
- **Repository**: Allow creating new Git repositories
  - Introduce `CreateRepositoryForm` to initialize empty Git repositories
  - Add `CopyToClipboardMenuAction` for repository paths and remote URLs
  - Refactor "Add Repository" into a submenu for better organization
- **Git**: Add keyboard shortcuts for remote host actions (Issues, Actions, Pipelines)
- **Git**: Enable Commit Changes action for empty repositories

### Changed
- **Core**: Reorder `FileManagerActions` and `ToggleDetailAction` in views
- **Manage Repositories**: Adjust `RepositoryAttachedLinksAction` placement
- **Manage Repositories**: Separate quicklink action section

## [Initial Version] - 2025-11-13

- Added Git Client extension

# Changelog

## [Update] - {PR_MERGE_DATE}

### Added
- **Manage Repositories**: Auto-open last visited repository
  - Introduce `openLastVisitedRepository` preference to automatically open the previously visited repository
  - Cache the path of the last opened repository between sessions
  - Automatically navigate to the last visited repository if preference is enabled
  - Update `Show Repository` action to track and clear last visited path
- **Language Icons**: Add icons for HTML and Markdown files

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

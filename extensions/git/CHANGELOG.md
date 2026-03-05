# Changelog

## [Update] - 2026-02-19

### Added
- **GitIgnore**: Add "Add to .gitignore" action for files in status view
  - Introduce `GitIgnoreAction` with form for adding patterns to `.gitignore`
  - Add `checkIgnorePattern` and `addToGitignore` methods to `GitManager`
  - Preview matched files before adding patterns
- **Gravatar**: Add user icon display options in commits list
  - Add `userIconProvider` preference (None, Author's initials, Gravatar variants)
  - Implement `GravatarIcon` component for Gravatar and initials-based avatars
  - Support Retro, Identicon, Mystery Person, Monsterid, Robohash, Wavatar styles
- **Submodules**: Add "Show Repository" action for submodules
  - Introduce `SubmoduleShowRepositoryAction` component
  - Enable opening submodules in a new window
  - Add "Update Submodule" action for updating submodules
  - Add "Delete Submodule" action for deleting submodules
  - Add "Add New Submodule" action for adding new submodules
  - Add "Update All Submodules" action for updating all submodules
- **Git Config**: Add "Git Config" view for managing local git config
- **Git LFS**: Add "Git LFS" view for managing Git LFS filters
- **Preferences**: Add new preferences:
  - "Initial Tab" preference for opening repositories
  - "Binary Path" preference for git binary path

### Changed
- **Interactive Rebase**: Improve UX and safety
  - Add search bar placeholder ("Pick, reword, edit, drop, squash, fixup")
  - Rename "Pick" action to "Apply Rebase" with Checkmark icon
  - Add pre-rebase guard for uncommitted changes
  - Use dynamic icons for squash and fixup actions (`arrow-down-left.svg`)
- **Commit Details**: Improve performance by fetching commit details only when needed

### Fixed
- **Git Clone**: Refactor clone process for improved reliability
- **Upstream Branch**: Enhance null safety in upstream branch handling

## [Update] - 2026-02-06

### Added
- **GitHub Integration**: Add deployment and GitHub Pages links
  - Add "Deployments" link with keyboard shortcut (Cmd+D) for GitHub repositories
  - Add "GitHub Page" link for accessing GitHub Pages sites

### Fixed
- **Branch Actions**: Correct remote branch name for checkout
  - Fix branch checkout logic to properly construct remote branch name

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

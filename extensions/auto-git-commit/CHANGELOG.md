# Auto Git Commit Changelog

All notable changes to this project are documented here.

## [0.1.0] - {PR_MERGE_DATE}

### Added

- Quick Git Commit command to browse repositories and commit changes
- AI-powered commit message generation with styles: conventional, simple, detailed
- Multiple commit modes: Preview, Quick (5s countdown), Auto commit
- Preferences: `autoStageAllFiles` to include unstaged changes; `autoPushAfterCommit` to push after commit
- Manage Repositories command with scanning, pin/unpin, batch operations, and refresh
- Repository metadata in detail view: staged/unstaged/untracked counts, ahead/behind, latest commit info
- Open repository in Finder and in preferred Terminal/IDE via `terminalIde` preference
- Optional repository context to improve AI commit message quality
- Regenerate commit message with on-the-fly instructions
- Index lock handling with unlock prompt when staging fails due to `index.lock`
- AI-powered repository context generation - automatically analyze and describe repositories
- "Generate Context with AI" action in Edit Repository form (⌘+G)
- Support for repositories without any commits (new/empty repositories)
- Proper icons for all actions throughout the UI
- Keywords in package.json for better discoverability

### Changed

- Unified preference handling to prioritize Raycast extension preferences with local storage fallback across commit flows
- Updated git branch detection to use `git symbolic-ref` for better compatibility with new repositories
- Improved README with detailed getting started guide, commands documentation, and configuration instructions

### Fixed

- Commit preview previously ignored the Raycast preference for `autoStageAllFiles`, defaulting to false. Now merges Raycast preferences with local storage
- Fixed error when working with new repositories that have no commits yet
- Fixed branch name showing as "unknown" for new repositories without commits
- Fixed unused `isGeneratingContext` state variable in AddRepository component

### Notes

- Initial public release of Auto Git Commit
- MIT License
- All data stored locally, no external API calls except Raycast AI

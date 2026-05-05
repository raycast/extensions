# Repository Manager Changelog

## [Repository Workflow and Performance Improvements] - {PR_MERGE_DATE}
- **Repository List Health**: Show Git status, upstream, ahead/behind, dirty state, and recently opened indicators directly in the repository list
- **Health Filters**: Filter repositories by attention state, dirty worktrees, ahead/behind branches, missing upstreams, and recently opened projects
- **Project Scripts**: Discover and run scripts from `package.json`, `Makefile`, `justfile`, and `Taskfile` files
- **Configuration Tools**: Validate project config files and migrate legacy config filenames to `.raycast/repository-manager.json`
- **Git Remote Shortcuts**: Open pull requests, issues, actions/pipelines, compare pages, and new pull request pages for supported Git hosts
- **Commit History Improvements**: Display tags in commit history and commit details
- **Code Statistics Control**: Generate `cloc` statistics on demand instead of running them automatically
- **Scanning Performance**: Scan project directories concurrently, skip generated dependency/build folders, prune deleted projects from the cache, and resolve `~` paths consistently
- **Git Status Performance**: Detect untracked files without counting every untracked path, improving performance in large repositories
- **List Preferences**: Add controls for Git info and the Recently Opened section in the repository list

## [Cloc command to show statistics] - 2025-06-25
- Better handling of cloc command, displaying installation options when not found

## [Advanced Git Integration & Enhanced UI] - 2025-06-24
- **Git Statistics & Analytics**: View comprehensive repository statistics including total commits, branches, tags, and contributor analysis
- **Git Commits Browser**: Browse commit history with branch selection, view detailed commit information, and copy commit hashes
- **Performance Optimizations**: Optimized directory scanning, caching mechanisms, and UI rendering

## [Add Customizable Primary Action] - 2024-09-07
- Fix issue with duplicated repositories not showing up because of not unique indexes
- Add customizable primary action in settings

## [Add Favorites] - 2024-09-07
- Add the possibility to mark a project as favorite to show it at the top of the list

## [Initial Version] - 2023-10-06

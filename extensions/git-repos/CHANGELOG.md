# Git Repos Changelog

## [Bug Fix] - {PR_MERGE_DATE}

- Fixes determination of remote URLs for worktrees.

## [Bug Fix] - 2025-05-28

- Fixes an issue where if a directory path contained ".git", it would not be properly parsed. A common case is the special GitHub ".github" repository.

## [Bug Fix] - 2024-02-10

- Make find command handle errors better
    - Changed exit code to be always zero so execp doesn't throw
    - Filter out error commands due to unreadable directories in the path

## [Enhancement] - 2023-12-07

- Added sotring of results based on usage recency - most used paths will appear on top

## [Bug Fix] - 2023-10-21

- Resolved issue with binary plist for reading default browser. Now checks against all known browser paths as a fallback.
- Fixed "Open in All Applications" opening browser not as a url

## [Enhancement] - 2023-10-18

- Added option to filter search with the entire repo path.
- Added ability to filter by repo type (normal repos vs submodules vs worktrees).
- Resolved issue where submodules that have been renamed would not be found.

## [Bug Fix] - 2023-10-17

- Resolved issue when the scan path contains a space.
- Update to the latest Raycast API.

## [Enhancement] - 2022-04-20

- Added a new action for the List Repos command to mark repos as favorites that will be displayed at the top.
- Replaced custom caching logic with useCachedPromise.
- Update to the latest Raycast API.

## [Enhancement] - 2022-11-25

- Added a new action for List Repos command to open in all assigned applications at once.

## [Bug Fix] - 2022-03-31
- Resolved issue due to cache schema changes

## [New Additions] - 2022-03-30
- Open the action's app with the repo remote URL if it has one and the app's bundle id matches the system default browser's bundle id; otherwise, use the repo path.
- Update to latest Raycast API

## [Store Updates] - 2022-03-14
- Add categories and screenshots for the store
- Update to latest Raycast API

## [New Additions] - 2022-02-10
- Add Open with preferences
- Update to latest Raycast API

## [New Additions] - 2021-10-18
- Add support for Git Worktrees
- Add additional actions

## Added [Git Repos] - 2021-10-15
- Initial version

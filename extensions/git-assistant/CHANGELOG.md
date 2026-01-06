# Git Assistant Changelog

## [Clone Repository Tool] - 2025-12-07
- Added `clone-repository` tool.

## [Git Tools Enhancements] - 2025-11-24
- Added checkout and branch management tools (`checkout-branch`, `create-branch`, `get-current-branch`, `get-git-branches`).
- Introduced diff and change inspection tools for staged, unstaged, and target comparisons with improved output trimming.
- Expanded staging workflows with `stage-files`, `unstage-files`, and `reset-staged` for fine-grained index control.
- Added commit inspection and recovery tools (`show-commit`, `revert-commit`) for safer history operations.
- Added history and status overview tools (`get-git-log`, `get-git-status-summary`) plus `pull-current-branch` and `push-current-branch` for remote synchronization.
- Improved branch name escaping, updated lint configuration, dependencies, and eval data, and enhanced `ai.yaml` guidance for tool usage and commit message style.

## [Rewrite of Search Git Repositories Command] - 2025-05-06
- Rewrote the repository search logic. Now it finds from a list of directories specified in the extension preferences instead of scanning the entire file system which was not working reliably.
- Added support for favorite repositories.


## [✨ AI Enhancements] - 2025-02-21
- Initial release with AI-powered conventional commits and git repository management.

# Git Worktree Changelog

## [Add setup commands and refactor command/shell env execution] - 2026-02-23

- Add setup commands configuration for worktrees
- Refactor execute command and shell env
- Simplify directory finding logic with fast glob
- Update default to skip commit hooks on push

## [Fix Remove Worktree Infinite Loading] - 2026-02-20

- Fix remove worktree action showing infinite loading spinner on unexpected errors
- Quote paths in git commands to handle paths with spaces

## [Initial Version] - 2025-04-16

Added Git Worktrees extension

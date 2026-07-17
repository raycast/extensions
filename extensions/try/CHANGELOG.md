# try Changelog

## [Improvements] - 2026-06-19

- Clone now runs asynchronously with a live progress toast, so the UI no longer freezes during the clone
- Disabled the Clone action while a clone is in progress to prevent accidental duplicate clones
- Added Open and Show in Finder actions to the success toast, and a Copy Error action on failure
- Clone failures now keep the form open with your input preserved and show git's actual error message
- Hardened git clone to pass arguments directly (no shell), avoiding URL quoting/injection issues
- Updated to the latest Raycast API and tooling stack (@raycast/utils 2.x, ESLint config 2.1.1, TypeScript 5.9, Prettier 3.8)

## [Bug Fix] - 2026-01-19

- Fixed directory creation error on first launch when parent directories don't exist
- Added configurable try directory path preference (default: ~/src/tries)
- Implemented recursive directory creation to prevent ENOENT errors
- Added path expansion utility for tilde paths

## [Initial Version] - 2026-01-15

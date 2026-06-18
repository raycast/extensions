# try Changelog

## [Improvements] - {PR_MERGE_DATE}

- Clone now runs asynchronously with a live progress toast, so the UI no longer freezes during the clone
- Disabled the Clone action while a clone is in progress to prevent accidental duplicate clones
- Added Open and Show in Finder actions to the success toast, and a Copy Error action on failure
- Clone failures now keep the form open with your input preserved and show git's actual error message
- Hardened git clone to pass arguments directly (no shell), avoiding URL quoting/injection issues

## [Bug Fix] - 2026-01-19

- Fixed directory creation error on first launch when parent directories don't exist
- Added configurable try directory path preference (default: ~/src/tries)
- Implemented recursive directory creation to prevent ENOENT errors
- Added path expansion utility for tilde paths

## [Initial Version] - 2026-01-15

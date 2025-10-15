# Raycast Zoxide Changelog

## [Added Additional Path Directories Preference] - {PR_MERGE_DATE}

- Added preference to allow additional directories to be prepended to PATH when executing commands
- Added path-helper utility functions to handle default paths and clean path generation
- Converted all instances where we set a PATH to use new utility functions
- Updated to latest versions of dependency packages

## [Added support for Intel Macs] - 2025-08-05

- Fixed compatibility with `zoxide` and `fzf` installed via Homebrew on Intel Macs
- Made some small optimizations to program search paths that shouldn't affect anything

## [Added Open In Preference] - 2025-06-26

- Added preference to select application to open directories in
- Updated to latest versions of dependency packages

## [Initial Version] - 2025-05-09

Initial version code

# Raycast Zoxide Changelog

## [Add Features from Zoxide Plus] - 2026-06-07

Inspired by [UnlockHomes](https://github.com/UnlockHomes)' [similar zoxide extension](https://github.com/raycast/extensions/pull/27348), this update brings over several of its ideas — a configurable search mode, opening directories in your terminal or editor, and more per-result actions.

- [Added] A "Search Mode" preference with two ways to search:
  - **Full Path (fuzzy):** Fuzzy-match across the entire path with fzf (the default; unchanged from previous versions, requires fzf)
  - **Folder Name (strict):** Match the folder name using zoxide's native ranking (re-queried on each keystroke, no fzf required)
- [Added] New search result actions:
  - **Open in {Terminal App}:** open the highlighted directory in your configured terminal (default: Terminal)
  - **Open in {Editor App}:** open the highlighted directory in your configured editor (default: TextEdit)
  - **Boost in Zoxide:** bump the directory's frecency score in zoxide
  - **Show in Finder:** reveal the directory in its enclosing folder
- [Changed] The primary "Open Folder" action now reflects the app chosen in the "Open directories in" preference — e.g. "Open in Finder" (or "Open in ForkLift", etc.)
- [Changed] When no Finder window is currently open, the "Add from Finder" command now opens a native macOS folder picker
- [Changed] Updated dependencies to their latest compatible versions
- [Removed] **Breaking:** "Add from Finder" no longer appears in the search result action panel — it didn't relate directly to the highlighted result, so it now lives solely as a root command

## [Fixed Memory Limit Crash] - 2026-03-24

- Fixed "JS heap out of memory" crash for users with large zoxide databases by capping rendered results to 500
- Updated to latest versions of dependency packages

## [Added Additional Open With Action] - 2026-01-31

- Added "Open With" action to the actions pane that allows opening the directory in a different app not set in the Zoxide settings.

## [Added Search using Spotlight Secondary Action] - 2025-11-10

- Added "Search using Spotlight" secondary action to Zoxide results to enable searching for directories not in the list. Previously was only accessible via an empty list.

## [Added Additional Path Directories Preference] - 2025-10-16

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

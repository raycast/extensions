# Rename Changelog

## [Fix] - 2026-08-03

- Fix a case-only rename silently overwriting a different file on case-sensitive volumes
- Decide whether a rename target is the same file by inode identity rather than by lowercasing the path, so the overwrite guard and batch conflict detection are correct on any filesystem
- Fix a rename silently destroying a symlink at the target path when the symlink's own target was missing
- Allow renaming a symlink whose target is missing, instead of reporting the source as gone

## [Security Fix] - 2026-04-06

- Replace AppleScript-based renaming with native Node.js `fs.rename()` to fix shell injection vulnerability
- Add per-file error handling with individual success/failure tracking
- Add conflict detection to prevent overwriting existing files
- Add filename validation for macOS compatibility

## [New Feature] - 2026-03-05

### Added

- Added "Advanced Batch Rename" command with a rule-based engine.
- Supports stacking multiple rules: Find & Replace (Regex), Change Case, Add Text, Sequential Numbering, and Extension Management.
- Real-time "Will Rename" preview with conflict detection.
- Rule reordering and editing support.

## [Enhancement] - 2025-09-15

- Fix the bug that cause rename incorrect issue.
- Improve the rename script with better file/directory detection and special character handling.

## [New feature] - 2024-12-02

- Add a new `Replace File(s) Characters` command to change characters in file names.

## [Add separate options feature] - 2024-11-04

- Add separate options feature to rename file command.

## [Initial Version] - 2024-01-19

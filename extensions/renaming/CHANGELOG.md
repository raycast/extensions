# Renaming Changelog

## [2.0.0] - {PR_MERGE_DATE}

### Added
- Undo/History System: All rename operations are now tracked and can be undone with ⌘Z
- Case Transformation: 8 case styles (UPPERCASE, lowercase, Title Case, camelCase, PascalCase, snake_case, kebab-case, Sentence case)
- Regex Support: Find and replace now supports regular expressions with live validation
- Folder Renaming: Dedicated commands for renaming folders with all the same options as file renaming
- Rename from Clipboard: Use names copied to clipboard to rename selected files
- AI Smart Rename: Generate descriptive filenames using Raycast AI based on file metadata (requires Raycast Pro)
- Rename History Command: View all recent operations and undo multiple changes at once
- Presets System: Save and reuse rename configurations with the new Presets command
- Sequential Numbering Options: Configure start number, increment, and zero-padding

### Fixed
- Fixed single-file rename: The extension now works correctly when only one file is selected (previously showed empty form)
- Fixed silent failures with large batches: Removed ARG_MAX limitations by switching from AppleScript to native Node.js
- Added conflict detection to prevent accidental overwrites when renaming would create duplicate filenames
- Added per-file error handling so one failure doesn't stop the entire batch

### Changed
- Complete rewrite with modular architecture
- Loading indicators while fetching files
- Progress toasts for large batch operations
- Confirmation dialogs before destructive batch renames
- Preview now shows up to 5 files with their new names
- Success toasts now include "Press ⌘Z to undo" hint
- Better error messages with specific details about what failed
- Extracted shared utilities into reusable modules
- Replaced synchronous file operations with async versions

### Security
- Fixed critical security vulnerability: Replaced AppleScript-based renaming with Node.js `fs.rename()` to eliminate shell injection risks
- Added proper filename validation to prevent path traversal and invalid characters

## [Enhancement] - 2025-09-15

- Fix the bug that cause rename incorrect issue.
- Improve the rename script with better file/directory detection and special character handling.

## [New feature] - 2024-12-02

- Add a new `Replace File(s) Characters` command to change characters in file names.

## [Add separate options feature] - 2024-11-04

- Add separate options feature to rename file command.

## [Initial Version] - 2024-01-19

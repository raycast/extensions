# Rename Changelog

## [Folder Commands] - 2026-08-19

- ⚠️ Breaking: Rename File(s) and Replace in File Names now act only on files — folders in the selection are left untouched instead of being renamed, and a selection holding no files reports that rather than renaming anything
- Add Rename Folder(s) and Replace in Folder Names commands, the folder counterparts of the two file commands, targeting only the folders in the Finder selection
- Retitle Replace File(s) Characters to Replace in File Names, matching its folder counterpart — a title-only rename (the files-only scoping above is the behaviour change), so shortcuts and aliases keep working
- Add an "Apply to" scope to Advanced Batch Rename — Files (default), Folders, or Files & Folders — with the preview list showing exactly what the current scope will rename
- Name the right thing everywhere: toasts, confirmations and history entries say files, folders, or items according to what was actually renamed

## [Undo History] - 2026-08-10

- Add Rename History command to view and undo recent rename operations
- Record successful renames from Rename File(s), Replace File(s) Characters, and Advanced Batch Rename
- Undo a whole operation, roll back multiple operations to a point in time, or undo a single file from an operation's details
- Track each file's undo status (renamed, undone, could not undo) with per-file conflict handling and retry
- Preview conflicts before undoing: the confirmation says how many files can be restored and why the rest cannot
- Show a preview and file metadata (status, directory, size, modified date) in the operation detail side panel: images render inline, text files show their first lines
- Open Rename History after a successful rename from any command, so the completed batch is immediately reviewable and undoable

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

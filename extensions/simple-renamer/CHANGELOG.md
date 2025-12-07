# Changelog

## [Initial Version] - {PR_MERGE_DATE}

### Added
- **7 Renaming Modes**:
    - **Find & Replace**: Regex support, token replacement.
    - **Sequential Numbers**: Append, Prepend, or Template numbering (e.g. `File_01`).
    - **Add Date**: Created, Modified, or Today's date.
    - **Change Case**: Uppercase, lowercase, camelCase, etc.
    - **Prefix/Suffix**: Add text to start or end.
    - **Remove Characters**: Trim from start or end.
    - **Overwrite**: Full template control.
- **Duplicate Detection**: Warns if renaming would cause filenames to collide.
- **Cross-Platform Support**: Robust path handling for Windows compatibility.
- **Clipboard Error Logging**: Detailed error messages are copied to clipboard on failure.

### Fixed
- Fixed issue where case-only renames (e.g. `file` -> `FILE`) failed on case-insensitive file systems (macOS/Windows).
- Improved error handling and validation.

### Removed
- **Folder Renaming**: Removed folder renaming support to ensure maximum stability and prevent recursive issues.

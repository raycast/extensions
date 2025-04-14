# Tana Paste For Raycast Changelog


## [1.5.2] - {PR_MERGE_DATE}

### Changed

- Updated extension icon

## [1.5.1] - 2025-04-13

### Added

- Transcript extraction for YouTube videos in the YouTube to Tana command (into Transcript field)
- Graceful fallback when transcript is unavailable

## [1.5.0] - 2025-04-13

### Added

- YouTube to Tana command to extract video metadata and convert to Tana format (#15)
- Support for extracting video title, URL, channel, author and description from YouTube pages

## [1.4.3] - 2025-04-08

### Changed

- Updated memory bank with correct GitHub CLI usage instructions
- Fixed documentation about handling newlines in GitHub commands

## [1.4.2] - 2025-04-08

### Changed

- Renamed extension to "tana-paste-for-raycast" to avoid naming conflicts
- Refactored complex date pattern regex into named components for improved readability and maintainability
- Extracted magic indentation numbers to named constants
- Enhanced code quality through better naming and organization

## [1.4.1] - 2025-04-06

### Changed

- Cleaned up directory structure
- Removed duplicate example files
- Updated documentation approach

## [1.4.0] - 2025-04-05

### Fixed

- Corrected indentation hierarchy for bullet points under deeper heading levels (H3+) (#11)
- Improved handling of Limitless Pendant transcription indentation
- Made output more robust by checking content and hierarchy

## [1.3.0] - 2025-04-03

### Added

- Support for YouTube transcript timestamps as separate nodes in Tana (#4)

### Fixed

- Properly preserve bold text formatting in standard markdown (no longer converts to italic-underscore format) (#5)
- Correct indentation hierarchy for numbered headings and their content (#5)
- Improved error handling and stability

## [1.1.0] - 2023-04-02

### Added

- Improved output formatting
- Support for more complex Markdown formatting
- Better handling of fields with colons
- Proper preservation of URL syntax

## [1.0.0] - 2023-03-15

### Added

- Initial release with main features:
  - Convert Markdown bullet points to Tana nodes
  - Support for headings as parent nodes
  - Handle nested content with proper indentation
  - Parse fields with colons and convert to Tana format
  - Process inline formatting
  - Support for timestamps

### Features
- Convert Markdown headings to Tana nodes with proper indentation
- Intelligent field detection to distinguish between actual fields and regular text with colons
- Preserve bracketed elements in text that shouldn't be converted to tags
- Proper handling of URL and link syntax
- Process inline formatting (bold, italic, highlights)
- Convert dates to Tana's date format
- Handle nested lists and indented content
- Automatic opening of Tana after conversion 
# Tana Paste Changelog

## [Unreleased]

### Added

- Support for YouTube transcript timestamps as separate nodes in Tana (#4)

## [1.1.0] - 2023-04-02

### Changed

- Improved output of indentation, bullets, and list styles.

## [1.0.0] - 2023-04-01

### Added

- Initial version.
- Support for converting Markdown bullet points to Tana bullet points.
- Support for handling timestamps as formatted fields.
- Support for Markdown headings converted to regular nodes (not headlines).
- Support for numbered lists (1. 2. 3. etc).
- Support for lettered lists (a. b. c. etc).
- Support for colons - adding a node below the colon that captures the items that follow.
- Support for converting common date format to Tana date fields.

### Features
- Convert Markdown headings to Tana nodes with proper indentation
- Intelligent field detection to distinguish between actual fields and regular text with colons
- Preserve bracketed elements in text that shouldn't be converted to tags
- Proper handling of URL and link syntax
- Process inline formatting (bold, italic, highlights)
- Convert dates to Tana's date format
- Handle nested lists and indented content
- Automatic opening of Tana after conversion
- Python script alternative for handling large files or batch conversion 
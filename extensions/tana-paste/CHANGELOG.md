# Tana Paste Changelog

## [Unreleased]

## [1.3.0] - 2025-04-03

### Added

- Support for YouTube transcript timestamps as separate nodes in Tana (#4)
- Support for Limitless Pendant transcription format (#8)

### Fixed

- Properly preserve bold text formatting in standard markdown (no longer converts to italic-underscore format) (#5)
- Correct indentation hierarchy for numbered headings and their content (#5)

## [1.2.0] - 2025-04-03

### Added

- Support for YouTube transcript timestamps as separate nodes in Tana
- Comprehensive Jest testing infrastructure

### Fixed

- Properly preserve bold text formatting in standard markdown (no longer converts to italic-underscore format)
- Correct indentation hierarchy for numbered headings and their content
- Improved error handling and stability

## [1.1.0] - 2023-04-02

### Added

- Improved output formatting in the Python script
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
- Python script alternative for handling large files or batch conversion 
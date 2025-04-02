# Tana Paste Changelog

## [Fix bullet point and list formatting] - {PR_MERGE_DATE}

### Fixed
- Improved bullet point (•) detection and formatting
- Fixed handling of lettered and numbered lists (a., b., 1., etc.)
- Enhanced indentation detection to handle tabs correctly
- Ensured proper nesting of content under list items ending with colons
- Fixed inconsistent indentation of related list items

## [1.0.0] - 2025-04-01

### Added
- Initial release of Tana Paste extension for Raycast
- Three commands to convert content to Tana Paste format:
  - Quick Clipboard to Tana: instantly convert clipboard content
  - Paste and Edit for Tana: edit before converting
  - Convert Selected Text to Tana: convert currently selected text

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
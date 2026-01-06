# Paste to Markdown Changelog

## [Add Table and GFM Support] - 2026-01-06

### Added

- Support for GitHub Flavored Markdown (GFM) using @joplin/turndown-plugin-gfm
- Automatic conversion of HTML tables to markdown table format
- Support for additional GFM features including strikethrough and tasklists

### Updated

- Updated @raycast/api from ^1.100.3 to ^1.104.1
- Updated @raycast/eslint-config from ^2.0.4 to ^2.1.1
- Updated @types/turndown from ^5.0.5 to ^5.0.6
- Updated eslint from ^9.29.0 to ^9.39.2
- Updated prettier from ^3.6.0 to ^3.7.4
- Updated turndown from ^7.2.0 to ^7.2.2
- Updated typescript from ^5.8.3 to ^5.9.3

## [Initial Release] - 2025-07-15

### Added

- Core functionality to convert HTML clipboard content to Markdown
- Support for Turndown library for HTML-to-Markdown conversion
- Comprehensive preferences system with 9 customizable options:
  - Heading style (ATX/Setext) - defaults to ATX
  - Horizontal rule style customization - defaults to "---"
  - Bullet list marker (\*/−/+) - defaults to "-"
  - Code block style (fenced/indented) - defaults to fenced
  - Code fence style selection (backticks vs tildes) - defaults to backticks
  - Emphasis delimiter choice (underscore vs asterisk) - defaults to underscore
  - Strong delimiter choice (double asterisk vs double underscore) - defaults to double asterisk
  - Link style (inline/referenced) - defaults to inline
  - Link reference style options (full, collapsed, shortcut) - defaults to full
- Command alias `pmd` for quick access
- Robust error handling with user-friendly HUD feedback messages
- Smart clipboard content detection
- Automatic pasting to active application
- Enhanced preferences UI with comprehensive formatting options

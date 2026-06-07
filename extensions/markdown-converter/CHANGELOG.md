# Markdown Converter Changelog

## [Smart Clipboard Detection] - 2026-05-11

- **Smart round-trip**: "Convert to" commands now handle rich text on the clipboard by round-tripping through Markdown first, instead of silently degrading. Copy styled text → run one command → paste clean formatting. Fixes [#26238](https://github.com/raycast/extensions/issues/26238)
- **Descriptive HUD**: Toast messages show the conversion path taken (e.g. "Rich text → Markdown → Google Docs")
- **Email layout tables**: Email HTML (Gmail, Outlook, etc.) using tables for layout now converts correctly — text, links, and formatting are preserved instead of producing broken table artifacts

## [Bidirectional Conversion] - 2026-02-27

- **Bidirectional conversion**: Three new commands to convert Markdown/Org to rich text
  - "Convert Clipboard to HTML" - generic HTML output
  - "Convert Clipboard to Google Docs" - optimized for Google Docs paste
  - "Convert Clipboard to Word 365" - optimized for Word paste
- **Slack output**: "Convert Clipboard to Slack" command for Slack mrkdwn format
- **Org-mode output**: "Convert Clipboard to Org" command for Org-mode users
- **Auto-detection**: Automatically detects Markdown vs Org-mode vs plain text input
- Improved Word code block spacing and font consistency
- GFM-style table conversion from Word and Google Docs
- Inline images in table cells are now preserved correctly
- Smart header detection from bold text in first row

## [Initial Release] - 2026-02-27

- Convert rich text from clipboard to Markdown format
- Support for Word documents, Google Docs, and web pages
- Automatic clipboard integration
- Clean, formatted Markdown output

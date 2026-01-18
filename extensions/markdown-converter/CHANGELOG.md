# Markdown Converter Changelog

## [Bidirectional Conversion] - {PR_MERGE_DATE}

- **Bidirectional conversion**: Three new commands to convert Markdown/Org to rich text
  - "Convert Clipboard to HTML" - generic HTML output
  - "Convert Clipboard to Google Docs" - optimized for Google Docs paste
  - "Convert Clipboard to Word 365" - optimized for Word paste
- **Org-mode output**: "Convert Clipboard to Org" command for Org-mode users
- **Auto-detection**: Automatically detects Markdown vs Org-mode vs plain text input
- Improved Word code block spacing and font consistency
- GFM-style table conversion from Word and Google Docs
- Inline images in table cells are now preserved correctly
- Smart header detection from bold text in first row

## [Initial Release] - {PR_MERGE_DATE}

- Convert rich text from clipboard to Markdown format
- Support for Word documents, Google Docs, and web pages
- Configurable image handling options:
  - Preserve all images
  - Preserve external images only  
  - Remove all images
- Automatic clipboard integration
- Clean, formatted Markdown output
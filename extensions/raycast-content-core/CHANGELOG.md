# Changelog

## [1.0.0] - {PR_MERGE_DATE}

### Added
- Initial release of Content Core extension for Raycast
- **Extract Content** command with smart auto-detection of URLs vs file paths
- **Summarize Content** command with 9 customizable summary styles
- **Quick Extract** command for instant extraction to clipboard
- Support for multiple content sources:
  - Web URLs with intelligent content extraction
  - Documents: PDF, Word, PowerPoint, Excel, Markdown, HTML, EPUB
  - Media files: MP4, AVI, MOV, MP3, WAV, M4A (automatic transcription)
  - Images: JPG, PNG, TIFF (OCR text recognition)
  - Archives: ZIP, TAR, GZ
- Multiple output formats: Plain Text, JSON, XML
- Real-time source type detection with visual feedback
- Integration with Content Core's zero-install uvx execution
- Comprehensive error handling and user guidance
- Keyboard shortcuts for all actions
- Raycast snippets creation and clipboard integration

### Configuration
- Optional OpenAI API key for audio/video transcription and AI summarization
- Optional Firecrawl API key for enhanced web content extraction
- Optional Jina AI API key for alternative web scraping service

### Features
- Smart auto-detection between URLs and file paths
- 9 summary styles: General, Bullet Points, Executive Summary, Key Takeaways, Research Summary, Meeting Notes, Technical Summary, Simple Explanation, Action Items
- Progress indicators and toast notifications
- Rich results display with metadata
- Copy to clipboard, paste, and save as snippet actions
- Open original source (URLs in browser, files in default app)
- Show files in Finder integration
- Create Raycast quicklinks for easy access
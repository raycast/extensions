# Content Core Raycast Extension

A Raycast extension that provides quick access to Content Core's powerful content extraction and summarization capabilities directly from your Raycast interface.

## Features

### Commands

1. **Extract from URL** - Extract content from any web page
2. **Extract from File** - Extract content from local files (PDF, Word, media, etc.)
3. **Extract from Clipboard** - Automatically detect and extract content from URLs or file paths in your clipboard
4. **Summarize URL** - Generate AI-powered summaries of web pages with customizable context
5. **Summarize File** - Generate AI-powered summaries of local files with various summary styles

### Supported File Types

- **Documents**: PDF, Word, PowerPoint, Excel, Text, Markdown, HTML, EPUB
- **Media**: MP4, AVI, MOV, MP3, WAV, M4A (transcription)
- **Images**: JPG, PNG, TIFF (OCR)
- **Archives**: ZIP, TAR, GZ

### Output Formats

- **Plain Text**: Clean, readable text format
- **JSON**: Structured data format
- **XML**: Structured markup format

## Installation

### Prerequisites

1. **Install uv** (Python package manager):
   ```bash
   curl -LsSf https://astral.sh/uv/install.sh | sh
   ```

2. **API Keys** (optional but recommended):
   - **OpenAI API Key**: Required for audio/video transcription and AI summarization
   - **Firecrawl API Key**: Optional, improves web scraping for complex sites
   - **Jina AI API Key**: Optional, alternative web scraping service

### Extension Setup

1. Install the extension in Raycast
2. Configure your API keys in Raycast Preferences → Extensions → Content Core
3. Start using the commands!

## Usage

### Extract Content from URL
- Launch "Extract from URL" command
- Enter any web page URL
- Choose output format (text, JSON, or XML)
- Get clean, extracted content

### Extract Content from File
- Launch "Extract from File" command
- Enter file path or drag-and-drop a file
- Choose output format
- Extract content from any supported file type

### Extract from Clipboard
- Copy a URL or file path to your clipboard
- Launch "Extract from Clipboard" command
- The extension automatically detects the content type
- Review and extract the content

### Summarize Content
- Use "Summarize URL" or "Summarize File" commands
- Choose from predefined summary styles:
  - General Summary
  - Bullet Points
  - Executive Summary
  - Key Takeaways
  - Technical Summary
  - Meeting Notes
  - Research Summary
  - Simple Explanation (explain to a child)

## Configuration

### API Keys

Configure these in Raycast Preferences → Extensions → Content Core:

- **OpenAI API Key**: Get from [OpenAI Platform](https://platform.openai.com/api-keys)
- **Firecrawl API Key**: Get from [Firecrawl](https://www.firecrawl.dev/)
- **Jina AI API Key**: Get from [Jina AI](https://jina.ai/)

### Keyboard Shortcuts

Each command supports various keyboard shortcuts:

- **Cmd+C**: Copy results to clipboard
- **Cmd+V**: Paste results to active application
- **Cmd+S**: Save results as Raycast snippet
- **Cmd+O**: Open original source (URL or file)
- **Cmd+F**: Show file in Finder (file commands)
- **Cmd+R**: Refresh clipboard content (clipboard command)

## Features

### Smart Content Detection
- Automatically detects URLs vs file paths in clipboard
- Validates file existence and accessibility
- Supports drag-and-drop for files

### Rich Results Display
- Formatted markdown output with metadata
- Processing time and content length statistics
- Error handling with helpful troubleshooting tips

### Integration Features
- Create Raycast snippets from results
- Create quicklinks for easy access
- Copy/paste functionality
- Open original sources

## Troubleshooting

### Common Issues

1. **"uvx not found" error**
   - Install uv: `curl -LsSf https://astral.sh/uv/install.sh | sh`
   - Restart Raycast after installation

2. **Audio/Video processing fails**
   - Ensure OpenAI API key is configured
   - Check that the file is accessible

3. **Web scraping fails**
   - Try adding a Firecrawl API key for better success rates
   - Some sites may block automated access

4. **File extraction fails**
   - Check file permissions and accessibility
   - Ensure file format is supported
   - For complex documents, try with different API keys

### Performance Tips

- Smaller files process faster
- Web pages with less JavaScript load more reliably
- Media files require more processing time for transcription

## About Content Core

Content Core is a powerful Python library that provides unified content extraction across multiple formats and sources. This Raycast extension provides a user-friendly interface to Content Core's capabilities using the zero-install `uvx` approach.

For more information, visit the [Content Core repository](https://github.com/lfnovo/content-core).
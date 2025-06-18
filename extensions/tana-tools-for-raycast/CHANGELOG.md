# Tana Tools for Raycast Changelog

## [1.0.0] - 2025-06-18

### 🎉 Initial Release

The most comprehensive tool for converting content to Tana Paste format, featuring intelligent content detection, customizable tags and fields, and browser integration.

#### ✨ Core Features

- **Smart Content Detection**: Automatically detects and optimally formats YouTube videos, web articles, transcripts, and plain text
- **YouTube Integration**: Extract complete video metadata, descriptions, and transcripts
- **Web Content Capture**: Extract clean, structured content from any webpage
- **Interactive Editing**: Preview and modify content before converting with the Paste & Edit command
- **Limitless Transcription Support**: Convert Limitless Pendant and App transcriptions with smart chunking

#### 🎛️ Customization Options

- **10 User Preferences** for complete control over Tana formatting:
  - Custom supertags for videos, articles, transcripts, and notes
  - Configurable field names (URL, Author, Transcript, Content)
  - Toggle author and description inclusion
  - Personalize output to match your Tana workflow

#### 🧠 Intelligent Processing

- **Smart Content Chunking**: Automatically breaks long transcripts into Tana-sized nodes, ready for AI
- **Markdown Processing**: Converts web content with proper heading hierarchy
- **Field Sanitization**: Prevents accidental Tana field creation with smart escaping

#### 🔧 Technical Notes

- **Cross-Browser Support**: Chrome, Arc, and Safari
- **Content Cleaning**: Removes problematic elements while preserving structure

#### 📋 5 Powerful Commands

1. **Quick Clipboard to Tana** - Instant conversion of clipboard content (use for anything, including Limitless transcripts)
2. **Paste and Edit for Tana** - Interactive editing of Tana-Paste format before pasting
3. **YouTube to Tana** - Complete video metadata and transcript extraction (note: you'll need to open the transcript first)
4. **Copy Page Content to Tana** - Clean webpage content capture (it might miss some stuff, but it's better than nothing 😉)
5. **Copy Page Content to Tana (Select Tab)** - Choose specific browser tab

#### 🛠️ Requirements

- **Raycast** 1.26.0 or higher
- **Node.js** 22.14 or higher
- **Browser Extension**: Raycast Companion for Chrome, Arc, or Safari (for web/YouTube features)


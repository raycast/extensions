# AI Assistant Changelog

## [1.1.3] - 2024-03-25

### Added
- New command "View Dictation History" for managing transcription history
- Complete transcription history management system
- Metadata tracking for all transcriptions
- Audio recording replay functionality
- Search and filter capabilities for transcription history
- Automatic cleanup system for old recordings

### Improved
- Enhanced dictation feature with history tracking
- Better file management for recordings
- More detailed metadata collection during dictation
- Updated documentation for all history-related features

## [1.1.2] - 2024-03-24

### Added
- Added comprehensive README files in all major directories
- Added detailed documentation for each component and utility
- Added new active app detection feature for better context awareness
- Added audio muting controls during dictation
- Added transcription history improvements

### Improved
- Enhanced directory structure documentation
- Updated development guidelines
- Improved code organization
- Better error handling in dictation process
- Enhanced privacy documentation

### Changed
- Restructured project documentation
- Updated main README with latest features
- Improved installation instructions
- Enhanced troubleshooting guide

## [1.1.1] - 2024-03-23

### Added
- New command "Manage Personal Dictionary" for dictionary management
- New command "Add Selected Word to Dictionay" for personal dictionary
- Improved documentation with detailed settings descriptions

### Changed
- Enhanced README with comprehensive feature descriptions
- Updated privacy section with more detailed information
- Improved credits section
- Added proper MIT license file

## [1.1.0] - 2024-03-22

### Added
- Personal dictionary support for custom word replacements
- System audio muting during dictation
- Experimental single-call mode for faster online dictation
- Configurable silence timeout for voice recording

### Improved
- Enhanced settings interface with detailed configuration options
- Better documentation and settings descriptions
- More flexible language handling options

## [1.0.0] - 2024-03-21

### Added
- Smart Translation with automatic language detection
- Voice Dictation with online (OpenAI) and local Whisper support
- Text Improvement features (grammar, style, tone)
- Page Summarizer with multi-language support
- Settings & Configuration management
- Support for multiple browsers
- Local Whisper model management
- Experimental single-call mode for dictation

### Features
- Automatic language detection between primary and secondary languages
- High-accuracy speech-to-text conversion
- Grammar and spelling correction
- Style enhancement and tone adjustment
- Web page content extraction and summarization
- Multi-language support
- Configurable AI models (GPT-4, GPT-3.5 Turbo)
- Offline speech recognition with local Whisper models

### Technical
- TypeScript/Node.js implementation
- OpenAI API integration
- Sox for voice recording
- Cheerio for web content parsing
- Local file management for recordings
- Browser integration via AppleScript
- Efficient caching mechanisms

# Changelog

All significant changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.2.0] - {PR_MERGE_DATE}

### Added
- Improved export workflow with clearer UI and better feedback
- Enhanced language support for English, Portuguese, and Spanish
- Better error handling with more informative messages
- Added keyboard shortcuts for common actions (⌘+Enter to export flashcards)

### Fixed
- Resolved empty state flicker issue in flashcard generation
- Fixed language inconsistencies throughout the application
- Improved error messages to be consistently in English
- Updated all UI text to follow Raycast's US English requirements
- Enhanced Anki connection handling with automatic retries

### Technical
- Standardized language handling across the application
- Improved type safety with better TypeScript annotations
- Fixed compatibility with all AI models available in Raycast

## [1.1.1] - 2025-03-10

### Fixed
- Resolved dependency conflict between `@testing-library/react-hooks` and `@types/react`
- Fixed typing errors in various components and tests
- Added support for all AI models available in Raycast
- Improved compatibility with newer versions of React and TypeScript

### Technical
- Updated dependencies to more stable versions
- Improved TypeScript typing for better type safety
- Fixed errors in automated tests

## [1.1.0] - 2025-03-07

### Added
- Flashcard difficulty adjustment (beginner, intermediate, advanced)
- Default difficulty level configuration in preferences
- Memory system to store generation and export parameters
- Support for all AI models available in Raycast

### Improved
- Cleaner and more informative flashcard preview interface
- AI flashcard enhancement function to generate more detailed complementary content
- Visual display of flashcard difficulty level
- Improved flashcard organization with enhanced formatting

### Technical
- History storage of last used parameters
- Enhanced processing for AI responses

## [1.0.0] - 2025-03-06

### Added
- Initial release of Anki AI extension for Raycast
- AI-powered flashcard generation from selected texts
- Support for multiple languages:
  - English
  - Spanish
  - Portuguese
- Complete AnkiConnect integration
- Customizable settings:
  - Anki deck and model selection
  - AI prompt customization
  - Adjustable number of generated flashcards
- Automatic generation of relevant tags based on content
- Flashcard preview and editing interface before exporting
- AI enhancement of existing flashcards

### Improved
- Optimized performance for fast text processing
- Intuitive interface integrated with Raycast workflow

### Technical
- Implemented automated tests to ensure extension quality
- Comprehensive error handling and detailed logging
- Complete code documentation

### Note
This is the first public version of the Anki AI extension for Raycast. We appreciate your feedback to continue improving the tool!

[1.2.0]: https://github.com/your-username/anki-raycast-ai/releases/tag/v1.2.0
[1.1.1]: https://github.com/your-username/anki-raycast-ai/releases/tag/v1.1.1
[1.1.0]: https://github.com/your-username/anki-raycast-ai/releases/tag/v1.1.0
[1.0.0]: https://github.com/your-username/anki-raycast-ai/releases/tag/v1.0.0

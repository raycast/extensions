# Changelog

All significant changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.2.4] - 2025-03-13

### Fixed

- Improved JSON parsing in flashcardGenerator.ts for better error handling
- Added detailed error messages with full response context
- Made options parameter optional with default empty object
- Fixed code style issues across multiple files

## [1.2.3] - 2025-03-12

### Improved

- Translated all comments and error messages to English for better code maintainability
- Standardized language across the entire codebase
- Improved error messages for better user experience
- Consistent terminology throughout the application

## [1.2.2] - 2025-03-10

### Improved

- Implemented exponential backoff retry mechanism to avoid 504 Gateway Timeout failures
- Dynamic timeout that progressively increases in subsequent attempts
- Intelligent detection of network and timeout errors for automatic recovery
- NetworkHelper utility class to standardize network error handling across the application
- More user-friendly and detailed error messages

### Fixed

- 504 Gateway Timeout error during flashcard generation with the AI API
- Handling of unstable connections during intensive application use
- More robust integration with AnkiConnect using NetworkHelper

### Technical

- withRetry method that implements exponential backoff for API call retries
- Consistent formatting of error messages for the user
- Refined handling of specific error conditions for retry decisions
- Cleaner and more reusable code for handling network issues

## [1.2.1] - 2025-03-07

### Improved

- Significantly more robust and reliable Anki integration
- Enhanced modelNames method with greater timeout and reconnection attempts
- Handling of specific errors (ECONNRESET, socket hang up) during communication with AnkiConnect
- Fallback mechanism for note models when Anki is not available
- Detailed diagnostic logs to facilitate troubleshooting
- Portuguese user interface for better experience

### Fixed

- Issue with importing note models from Anki
- Proper handling of connection errors with clear messages for the user
- More comprehensive connection verification before export attempts
- Automatic connection recovery when possible
- Proper validation during the export process
- Code style issues in various files (Prettier 3.5.2)

### Technical

- Implementation of getConnectionStatus() for detailed diagnosis of connection problems
- attemptConnectionRecovery() method for automatic recovery of problematic connections
- Better mapping of flashcards to different Anki model types
- Enhanced support for Cloze models and media processing

## [1.2.0] - {PR_MERGE_DATE}

### Added

- Improved export workflow with clearer UI and better feedback
- Enhanced language support for English, Portuguese, and Spanish
- Better error handling with more informative messages
- Added keyboard shortcuts for common actions (⌘+Enter to export flashcards)
- Added support for Cloze deletion cards (fill-in-the-blank)
- Added support for including images in flashcards
- Intelligent field mapping for better compatibility with different Anki models
- Enhanced duplicate detection and management
- Detailed connection status diagnostics for Anki integration

### Fixed

- Resolved empty state flicker issue in flashcard generation
- Fixed language inconsistencies throughout the application
- Improved error messages to be consistently in English
- Updated all UI text to follow Raycast's US English requirements
- Enhanced Anki connection handling with automatic retries
- Fixed flashcard field mapping for compatibility with various Anki models
- Improved validation of flashcards before export

### Technical

- Standardized language handling across the application
- Improved type safety with better TypeScript annotations
- Fixed compatibility with all AI models available in Raycast
- Implemented robust flashcard-to-model field mapping
- Enhanced media file processing in Anki integration
- Added batch processing for large flashcard sets

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

[1.2.4]: https://github.com/your-username/anki-raycast-ai/releases/tag/v1.2.4
[1.2.3]: https://github.com/your-username/anki-raycast-ai/releases/tag/v1.2.3
[1.2.2]: https://github.com/your-username/anki-raycast-ai/releases/tag/v1.2.2
[1.2.1]: https://github.com/your-username/anki-raycast-ai/releases/tag/v1.2.1
[1.2.0]: https://github.com/your-username/anki-raycast-ai/releases/tag/v1.2.0
[1.1.1]: https://github.com/your-username/anki-raycast-ai/releases/tag/v1.1.1
[1.1.0]: https://github.com/your-username/anki-raycast-ai/releases/tag/v1.1.0
[1.0.0]: https://github.com/your-username/anki-raycast-ai/releases/tag/v1.0.0

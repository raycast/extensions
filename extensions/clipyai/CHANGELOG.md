# Changelog

All notable changes to ClipyAI will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - Initial Release {PR_MERGE_DATE}

### Features

- AI-powered clipboard enhancement
- Support for text and image processing
- Quick actions with customizable hotkeys
- Interactive chat functionality
- Vision model support
- Customizable settings
- Real-time clipboard monitoring
- History feature for quick actions
  - View last 20 actions (configurable limit)
  - Reuse previous results
  - Clear history option
  - Timestamp and metadata for each action
- Configurable history limit in preferences

### Technical

- Integration with OpenAI Chat Completions API
- Vision model support (GPT-4 Vision)
- Clipboard monitoring for text and images
- TypeScript implementation with React
- Error handling and user feedback
- Modular component architecture
- State management for chat history
- File system integration for image processing
- Moved to Raycast's LocalStorage API for data persistence
- Improved component organization
- Enhanced error handling for invalid data
- Fixed circular dependencies in components
- Fixed history loading issues
- Improved error handling for invalid history items
- Fixed type issues with chat messages

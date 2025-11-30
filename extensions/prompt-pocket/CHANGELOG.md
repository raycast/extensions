# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2025-11-30

### Initial Release 🎉

Prompt Pocket is now available on Raycast Store! A powerful extension for managing and reusing text prompts efficiently.

### Added

#### Core Features
- **Prompt Management**: Create, edit, and delete text prompts with ease
- **Search Functionality**: Quickly find prompts by searching through titles, body text, and tags
- **Quick Actions**: Instant copy to clipboard or paste directly to active application
- **Tag Organization**: Organize prompts using a flexible tag-based system
- **Last Used Tracking**: View when prompts were last accessed for better workflow insights

#### Advanced Features
- **Placeholder Support**: Dynamic placeholders for enhanced productivity
  - `{clipboard}`: Automatically insert current clipboard content
  - `{cursor}`: Set cursor position after pasting
- **Keyboard Shortcuts**: Optimized keyboard navigation
  - `⌘ + N`: Create new prompt
  - `⌘ + E`: Edit existing prompt
  - `⌘ + ⌫`: Delete prompt
  - `⌘ + D`: View prompt details
- **Detail View**: Comprehensive metadata display including creation date, last update, and usage statistics

#### Technical Excellence
- **Type Safety**: Full TypeScript implementation with comprehensive type definitions
- **Testing**: 109 unit and integration tests ensuring reliability
  - Unit tests for utility functions
  - Type validation tests
  - Placeholder processing tests
  - Integration tests for storage layer
- **Data Validation**: Robust input validation and error handling
- **Performance**: Efficient storage and retrieval using Raycast's local storage API

#### User Experience
- **Empty State Guidance**: Helpful prompts when no data exists
- **Error Messages**: Clear, actionable error messages
- **Responsive UI**: Fast and fluid interface
- **Confirmation Dialogs**: Safe deletion with confirmation prompts

[1.0.0]: https://github.com/marty-martini/raycast-prompt-pocket/releases/tag/v1.0.0


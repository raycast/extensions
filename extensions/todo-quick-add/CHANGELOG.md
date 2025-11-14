# Changelog

All notable changes to the To-Do Quick Add extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2024-11-14

### Added

- Initial release of To-Do Quick Add Raycast extension
- Quick task capture with smart parsing capabilities
- Smart tag parsing using `#tag` syntax
- Priority detection with `@high`, `@medium`, `@low` or natural language
- Flexible date parsing with `/tomorrow`, `/friday`, or natural phrases
- Natural language processing to understand phrases like "urgent task by tomorrow"
- Automatic removal of conversational filler words
- Real-time sync with Firebase Firestore
- Automatic Firebase config detection from iOS app
- Email/password authentication support
- Live task preview with detailed metadata display
- Tag matching against existing tags from your account
- Keyboard shortcuts for quick task creation (Cmd+Return)

### Features

- **Smart Parsing**: Automatically extracts tags, priorities, and dates from natural language
- **Real-time Sync**: Tasks instantly appear in your iOS/macOS To-Do app
- **Tag Matching**: Recognizes and matches your existing tags
- **Natural Language**: Understands phrases like "urgent meeting by friday"
- **Clean UI**: Beautiful task preview with gradient icons and detailed metadata
- **Firebase Integration**: Seamless connection to your existing To-Do app data


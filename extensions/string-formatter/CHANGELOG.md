# Changelog

All notable changes to the String Formatter extension will be documented in this file.

## [1.0.0] - 2025-09-29

### Added
- 🎉 Initial release of String Formatter extension
- ✨ String input with multi-line support
- 🔍 Auto-detection of input separators (comma, semicolon, pipe, space, tab, newline)
- 🎨 Multiple decorator options (single quotes, double quotes, backticks, brackets, parentheses, braces)
- 🔧 Custom output separator selection
- 🗑️ Character/string removal functionality
- 🔄 Duplicate removal with toggle option (enabled by default)
- 👀 Real-time preview of formatted results
- 📋 One-click copy to clipboard (⌘+C)
- 🔄 Reset functionality (⌘+R)
- 🌐 Multi-language support (Chinese/English)
- ⚠️ Comprehensive error handling with friendly messages
- 🎯 Clean UI with input/output sections separated by divider

### Features
- **Smart Separator Detection**: Automatically detects and suggests the most appropriate separator from input text
- **Flexible Output Formatting**: Support for various decorators and output separators
- **Duplicate Management**: Optional removal of duplicate items while preserving order
- **International Support**: Full Chinese and English interface support
- **User-Friendly Interface**: Intuitive form layout with real-time feedback
- **Keyboard Shortcuts**: Quick access to copy and reset functions

### Technical Details
- Built with TypeScript and React
- Uses Raycast API for native integration
- Follows Raycast design guidelines
- Comprehensive error handling and validation
- Optimized performance for large text inputs
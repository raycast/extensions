# Pain.is Screenshot Extension Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - {PR_MERGE_DATE}

### Added
- **Complete Pain.is Integration**: Full screenshot upload functionality to Pain.is servers
- **Multiple Screenshot Modes**: 
  - Area selection with click and drag
  - Window capture by clicking on windows
  - Full screen capture
  - Configurable default mode
- **Dedicated Commands**:
  - `Take Screenshot` - Uses configured default mode with full preferences
  - `Area Screenshot` - Quick area selection
  - `Window Screenshot` - Quick window capture  
  - `Full Screen Screenshot` - Quick full screen capture
- **Comprehensive Preferences**:
  - API key configuration (secure password field)
  - Custom server URL support
  - Screenshot mode selection
  - Mouse pointer inclusion toggle
  - Camera sound enable/disable
  - Preview before upload option
- **Smart Upload Features**:
  - Automatic file upload to Pain.is
  - URL instantly copied to clipboard
  - File size display in notifications
  - Proper error handling and user feedback
- **Advanced Error Handling**:
  - Network connectivity issues
  - Invalid API key detection
  - Rate limiting responses
  - File size limit enforcement
  - User cancellation support
- **macOS Integration**:
  - Native `screencapture` command usage
  - Proper temporary file management
  - System notification integration
  - HUD feedback for quick actions
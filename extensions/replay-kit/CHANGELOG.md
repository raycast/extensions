# Changelog

## [1.0.0] - Initial Release

### Added
- **Workflow Recording**: Record browser navigation, terminal commands, and application usage
- **Smart Browser Detection**: Supports Safari, Chrome, Arc, and Firefox
- **Tab Context Tracking**: Distinguishes between same-tab, new-tab, and new-window navigation
- **Interactive Review Interface**: Select and delete unwanted actions before saving
- **Sensitive Data Support**: Secure storage for credentials and API tokens
- **Intelligent Replay**: Browser-specific replay with auto-launch capability
- **Duplicate Prevention**: Filters consecutive duplicate actions
- **Tagging System**: Organize workflows with custom tags
- **Keyboard Shortcuts**: Efficient workflow management with hotkeys
- **Multi-User Support**: User-specific workflow storage
- **Robust Error Handling**: Graceful fallbacks and error recovery

### Features
- Real-time action monitoring with 3-second intervals
- Local storage using Raycast's secure LocalStorage API
- AppleScript integration for precise browser control
- Terminal history parsing for command capture
- Application process monitoring
- Form-based workflow configuration
- Progress tracking during replay
- Console logging for debugging

### Supported Applications
- **Browsers**: Safari, Google Chrome, Arc, Firefox
- **Terminals**: Terminal, iTerm, Hyper, Alacritty, Kitty
- **File Operations**: System file operations
- **Applications**: All macOS applications

### Technical Details
- TypeScript implementation with strict type checking
- React-based UI using Raycast API components
- AppleScript automation for browser control
- Shell command execution for system integration
- JSON-based data persistence
- Error boundaries and fallback mechanisms
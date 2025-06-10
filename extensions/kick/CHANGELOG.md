# Application Manager Changelog

## [Initial Release] - 2024-01-15

### Features
- View all running GUI applications on macOS
- Multi-select applications with spacebar
- Quit multiple selected applications at once
- Smart filtering to prevent quitting system applications
- Fast performance with parallel processing and caching
- Full keyboard navigation support
- Web app and PWA support with intelligent window handling
- Accessibility permissions handling with helpful error messages

### Keyboard Shortcuts
- `Space` - Select/deselect individual app
- `⌘ + Enter` - Quit selected apps
- `⌘ + S` - Select all apps
- `⌘ + Shift + S` - Deselect all apps
- `⌘ + R` - Refresh the application list

### Safety Features
- Confirmation dialog before quitting multiple applications
- System application protection (Finder, Dock, System UI Server, etc.)
- Graceful error handling with user-friendly messages
- Intelligent browser window management for web applications
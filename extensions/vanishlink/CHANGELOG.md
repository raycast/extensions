# VanishLink Changelog

## [1.0.0] - {PR_MERGE_DATE}

### Added

- Core bookmark management functionality
- Three main commands: add-from-clipboard, add, and open
- Configurable expiration settings through Raycast preferences
- Automatic title fetching from web pages
- Search and filter capabilities
- Bookmark editing and deletion
- Configurable expiration settings (1 day to 1 year)
- Automatic cleanup of expired bookmarks
- Inline bookmark editing capability
- URL validation and error handling

### Features

- **Add from Clipboard**: Instantly add URLs from clipboard with automatic title fetching
- **Manual Addition**: Form-based bookmark creation with custom titles
- **Smart Search**: Fast search by URL or title with real-time filtering
- **Auto-Expiration**: Configurable automatic deletion of unused bookmarks
- **Inline Editing**: Edit bookmark titles directly in the list view

### Technical Implementation

- Built with Raycast API v1.100.3
- TypeScript implementation with proper type safety
- Modular architecture with separated concerns
- Local storage using Raycast's storage API
- HTML parsing for automatic title extraction
- MD5-based unique ID generation for bookmarks

### Security

- Input validation for URLs and user data
- Safe HTML parsing without script execution
- No sensitive data storage or transmission

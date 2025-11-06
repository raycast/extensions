# Accordance Changelog

## [Initial Release] - 2025-11-06

### Added
- **Verse Lookup**: Search and display Bible verses directly from Raycast search bar
- **Module Selection**: Dynamic dropdown to choose from available Accordance text modules
- **Sequential Reading**: Read through Bible verses chapter by chapter with navigation
- **Advanced Search**: Access Accordance's powerful search tools and research features
- **Library Browser**: Browse all Accordance modules (texts, commentaries, lexicons, etc.)
- **Workspace Management**: Open saved Accordance workspace files (.accord)
- **Quick Search**: Direct command execution for fast Bible text searches
- **Automatic App Launch**: Accordance launches automatically when needed
- **Text Cleaning**: Automatic removal of extra spaces from verse results
- **Caching**: Performance optimization for module lists and search results
- **Default Text Preference**: Added configurable default Bible text module in Raycast preferences
  - Text field input for specifying preferred Bible version (defaults to "ESVS")
  - Applied consistently across all commands (Get Verses, Read Bible, Advanced Search)
  - Dynamic module selection respects user preference with intelligent fallbacks

### Features
- **Get Verses Command**: Primary interface for verse lookup with module selection
- **Read Bible Command**: Sequential reading with forward/backward navigation
- **Search Texts Command**: Quick search with direct execution (no UI)
- **Advanced Search Command**: Comprehensive search interface with multiple tools
- **Library Search Command**: Browse and search across all Accordance modules
- **Open Workspace Command**: File-based workspace discovery and opening

### Technical
- **Dynamic Module Selection**: Intelligent default module detection (respects user preferences)
- **File System Integration**: Direct workspace file discovery without AppleScript
- **AppleScript Integration**: Communication with Accordance for verse retrieval
- **URL Scheme Support**: Deep linking to Accordance search and workspace features
- **Error Handling**: Comprehensive error handling with user-friendly messages
- **Accessibility**: Full keyboard navigation and screen reader support

### Requirements
- **Accordance Bible Software**: Required for functionality (available at AccordanceBible.com)
- **macOS**: Platform-specific implementation using AppleScript
- **Raycast**: Latest API compatibility
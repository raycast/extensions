# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2025-11-12

### Added

- Initial release of Contentful extension
- Search entries across multiple Contentful spaces
- Multi-space configuration via preferences
- Real-time debounced search (300ms delay)
- Smart title extraction from common field names (title, name, internalName, displayName, label, heading)
- Display space name, content type, and last modified date for each entry
- Quick actions:
  - Open entry in Contentful Web App
  - Copy entry ID to clipboard
  - Copy entry URL to clipboard
  - Copy space ID to clipboard
  - Copy content type to clipboard
- Comprehensive error handling:
  - Invalid configuration detection
  - API error handling
  - Empty state messaging
- Enterprise-level architecture:
  - Type-safe TypeScript implementation
  - Modular architecture with separation of concerns
  - Reusable components
  - Pure utility functions
  - Custom React hooks
- Parallel API calls for optimal performance
- Proper handling of Contentful API rate limits
- Extensible design for future features

### Technical Details

- Uses official Contentful SDK (v11.8.12)
- Built with Raycast API (v1.103.6)
- TypeScript 5.8.2 for type safety
- React for component-based UI
- Follows functional programming principles
- Implements best practices for error handling and user experience

## Future Enhancements

### Planned Features

- Content type filtering
- Preview mode support (Content Preview API)
- Asset search
- Entry creation and editing
- Status filtering (published/draft)
- Locale selection
- Advanced search operators
- Bulk operations
- Favorites/bookmarks
- Recent searches
- Search history

# Radarr Changelog

## [1.0.1] - 2025-08-26

### Fixed

- Fixed TypeError when API data is undefined in search-movies command

## [Initial Version] - 2025-08-14

### Added

- **Search Movies** - Search TMDB and add movies to Radarr with configurable quality profiles and root folders
- **Movie Library** - Browse existing movie collection with grid view, detailed information, and management actions
- **Missing Movies** - View wanted/missing movies with availability status and search capabilities
- **Unmonitored Movies** - Manage movies that are not being actively monitored
- **Upcoming Releases** - Calendar view of movies scheduled for release in the next 2 months
- **Download Queue** - Real-time monitoring of active downloads with progress tracking and management actions
- **Instance Status** - Monitor connection status and health of multiple Radarr instances
- **System Status** - Background health checks with notifications (no-view command)

### Multi-Instance Support

- Configure primary and optional secondary Radarr instances
- Preference-based default instance selection
- Temporary instance switching within commands via action panels
- Connection status monitoring for all configured instances

### User Experience

- Real-time search with debounced API calls (500ms delay)
- Rich detail views with movie posters and comprehensive metadata
- Context-aware action panels with relevant operations per command
- Graceful error handling with user-friendly toast notifications
- Auto-refresh functionality for active operations (download queue)
- Intelligent caching for optimal performance

### Technical Features

- Full Radarr V3 API integration with X-Api-Key authentication
- TypeScript implementation with strict typing
- Reusable API hooks with comprehensive error handling
- Multi-instance configuration management
- Proper loading states and empty view handling
- Memory-efficient background operations

### Configuration Options

- Primary instance: name, URL, and API key configuration
- Secondary instance: optional additional Radarr instance
- Active instance selection for default behavior
- Extensible preference system for future enhancements

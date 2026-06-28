# Radarr for Raycast

> Manage your Radarr movie collection with powerful search, monitoring, and download management capabilities

A comprehensive Raycast extension that provides full integration with your Radarr instances, allowing you to search, monitor, and manage your movie collection directly from Raycast.

## Features

### 🔍 Movie Management

- **Search Movies** - Search and add new movies to your collection with detailed previews
- **Movie Library** - Browse and manage your existing movie collection
- **Missing Movies** - View wanted/missing movies with availability status
- **Unmonitored Movies** - Manage movies that are not being monitored

### 📅 Monitoring & Downloads

- **Upcoming Releases** - View upcoming movie releases from calendar
- **Download Queue** - Monitor active downloads with real-time progress tracking
- **System Status** - Background health check with notifications

### 🔧 Multi-Instance Support

- **Instance Status** - Monitor connection status of multiple Radarr instances
- **Seamless Switching** - Temporarily switch between instances within commands
- **Preference-based Defaults** - Set your preferred default instance

## Setup

### Prerequisites

- Radarr v3.0+ running and accessible
- Radarr API key (found in Settings > General > Security)

### Configuration

1. Install the extension from Raycast Store
2. Configure your Radarr instance(s) in extension preferences:

#### Primary Instance (Required)

- **Instance Name**: Friendly name for display (e.g., "Main Server")
- **Radarr URL**: Full URL to your Radarr instance (e.g., `http://localhost:7878`)
- **API Key**: Your Radarr API key

#### Secondary Instance (Optional)

- Enable the checkbox to add a second instance
- Configure name, URL, and API key for your second instance
- Set which instance to use as default

### Multi-Instance Usage

- **Default Instance**: Set your preferred default instance in preferences
- **Temporary Switching**: Use action panels within commands to temporarily switch instances
- **Status Monitoring**: Use "Instance Status" command to monitor connection health

## Commands

| Command                | Description                                                |
| ---------------------- | ---------------------------------------------------------- |
| **Search Movies**      | Search TMDB and add movies to Radarr with quality profiles |
| **Upcoming Releases**  | View movies scheduled for release in the next 2 months     |
| **Download Queue**     | Monitor active downloads with progress and ETA             |
| **Movie Library**      | Browse your collection with grid view and detailed info    |
| **Missing Movies**     | Find wanted movies and their availability status           |
| **Unmonitored Movies** | Manage movies not being actively monitored                 |
| **Instance Status**    | Monitor connection status of your Radarr instances         |
| **System Status**      | Check system health (background command)                   |

## Development

### Requirements

- Node.js 16+
- Raycast CLI (`npm install -g @raycast/cli`)

### Commands

```bash
# Development
npm run dev          # Start development with hot reload
npm run build        # Build for production

# Code Quality
npm run lint         # Check code quality and types
npm run fix-lint     # Auto-fix linting issues

# Raycast CLI aliases
ray develop          # Same as npm run dev
ray build           # Same as npm run build
ray lint            # Same as npm run lint
```

### Project Structure

```
src/
├── types.ts                    # TypeScript interfaces
├── config.ts                   # Multi-instance configuration
├── utils.ts                    # Helper functions
├── hooks/
│   └── useRadarrAPI.ts        # API hooks with error handling
├── search-movies.tsx          # Search and add movies
├── upcoming-releases.tsx      # Calendar view
├── download-queue.tsx         # Download management
├── movie-library.tsx          # Collection browser
├── missing-movies.tsx         # Missing movie tracking
├── unmonitored-movies.tsx     # Unmonitored management
├── instance-status.tsx        # Instance status monitoring
└── system-status.ts           # Health checks
```

## API Integration

This extension uses Radarr's V3 API with:

- **Authentication**: X-Api-Key header
- **Error Handling**: User-friendly notifications
- **Caching**: Intelligent caching with `@raycast/utils`
- **Real-time Updates**: Auto-refresh for active operations

## License

MIT License - see LICENSE file for details

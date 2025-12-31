# Changelog

All notable changes to the Kibana Discover extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - {PR_MERGE_DATE}

### Added

- **Multi-Instance Support**: Manage multiple Kibana instances with dropdown selector
- **Live Search**: Real-time filtering of data views as you type
- **Time Range Selection**: Choose from 7 preset time ranges (15m, 30m, 1h, 24h, 7d, Today, This week)
- **Column Configuration**: Select which fields to display in Kibana Discover
- **Search Query Input**: Set Kuery queries for filtered views (⌘Q shortcut, session only)
- **Custom Fields Per Instance**: Configure available fields for each Kibana instance
- **Smart Persistence**: Remembers your field selections and time ranges per data view
- **Detail View Toggle**: Switch between compact and detailed list views
- **Dynamic Icons**: Crown icon for production data views, Gear icon for others
- **Copy Actions**: Copy data view ID, name, or full Discover URL
- **Authentication Support**: Both Basic Auth (username/password) and API Key
- **Multi-Instance Cache**: Cache structure stores data per instance
- **Backward Compatibility**: Supports migration from single-instance format

### Features

- Fetch data views from Kibana API (supports Kibana 7.x and 8.x)
- Open data views directly in Kibana Discover with configured parameters
- Build URLs with selected columns, time range, and query
- Local caching for fast access without hitting Kibana API
- Keyboard shortcuts for all major actions
- Toast notifications for user feedback
- Self-signed certificate support for internal Kibana instances

### Commands

- **Search data-views**: Browse and search cached data views
- **Refresh data-views**: Fetch latest data views from Kibana instances

### Technical

- TypeScript for type safety
- React components using @raycast/api
- LocalStorage for user preference persistence
- File system caching for data views
- ESLint and Prettier for code quality

# Changelog

All notable changes to rhttp will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2025-10-22

### Initial Release

A complete HTTP client for Raycast with advanced features for API testing and development.

#### Added

- **Full HTTP Client** - Support for GET, POST, PUT, PATCH, DELETE, and GraphQL requests
- **Environment Management** - Multiple environments with variable substitution using `{{placeholder}}` syntax
- **Request Chaining** - Pre-request actions for authentication flows and multi-step workflows
- **Response Actions** - Extract data from responses and save to variables (temporary or persistent)
- **Collections** - Organize requests into collections with shared headers
- **Request History** - Automatic tracking of requests and responses with toggle to enable/disable
- **Cookie Management** - Automatic cookie handling across requests (RFC 6265 compliant)
- **cURL Support** - Import from cURL commands and export requests as cURL
- **Collection Import/Export** - Share collections as JSON files
- **Environment Import** - Import environments from clipboard
- **Request Cancellation** - Stop long-running requests
- **Backup/Restore** - Export all data with timestamps (secrets excluded for security)
- **Secret Variables** - Mark sensitive variables as secrets (hidden in UI)
- **JSON Explorer** - Interactive JSON response viewer with search and navigation
- **Request Sorting** - Sort by name, method, URL, or manual order
- **Open in Editor** - View responses in your preferred text editor
- **Keyboard-First Design** - 42 keyboard shortcuts with cross-platform support (macOS/Windows)
- **Help Documentation** - Comprehensive in-app help with examples and troubleshooting
- **Quick Start Guide** - README with installation and setup instructions

#### Security

- Secret variable values excluded from backups to prevent accidental exposure
- All data stored locally only
- SSL verification control for local development

#### Technical

- Built with TypeScript and Zod for type safety
- Persistent storage using nanostores with zod-persist adapters
- Comprehensive error handling and validation
- Axios for HTTP requests with custom SSL verification options
- Cross-platform keyboard shortcuts (Windows support implemented but untested - Raycast Windows Beta)
- Uses `Keyboard.Shortcut.Common.*` constants where available (11 shortcuts)
- Proper async/await patterns for data persistence
- @types/react 19.2.2 for React 19 compatibility

#### Breaking Changes

- Removed global environment concept - use environment-specific variables instead
- Default environment now named "default" instead of "Globals"
- Users migrating from development versions should manually move global variables to each environment

#### Known Limitations

- Windows keyboard shortcuts untested (Raycast Windows is in Beta)
- Environment variable references not possible (Raycast sandbox restriction)
- JSON Explorer has performance limits for very large responses (use "Open in Editor" instead)

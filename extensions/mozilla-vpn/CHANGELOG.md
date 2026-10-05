# Mozilla VPN Connect Changelog

## [1.2.0] - {PR_MERGE_DATE}

### Added
- 🤖 **AI-Powered Natural Language Commands** - Control your VPN using natural language
- 🔌 **Smart Connection Management** - Connect/disconnect with commands like "Connect to Germany" or "Turn off VPN"
- 📍 **Server Discovery** - List countries, cities, and servers with commands like "Show cities in USA"
- 🔄 **Intelligent Server Switching** - Change servers by country/city with automatic reconnection
- 📊 **Enhanced Status Reporting** - Get VPN status and IP information with "What's my IP?"
- 👤 **Account Portal Access** - Open and manage your Mozilla Account portal directly via AI ("Open Account", "Manage subscription") or the extension UI
- 🌍 **Country Aliases Support** - Understands "USA", "US", "United States", "UK", etc.
- 🔁 **Auto-Retry Logic** - Automatic connection retries for reliability
- 🎯 **Partial Name Matching** - Find countries/cities with partial names
- ⚡ **Instant Disconnection** - Immediate VPN disconnection without confirmation prompts

### Technical Improvements
- Modernized for Raycast 2.0 (macOS 27 Tahoe) compatibility
- Migrated background menubar refresh to compliant 1m interval with event-driven cache notifications
- Switched to FlagsAPI CDN for server location flags
- Replaced legacy Node.js http/https callbacks with native HTTPS fetch for geolocation and IP detection
- Switched Mozilla VPN binary execution to `execFile` with robust city/state parsing
- Full TypeScript rewrite with clean @raycast/api component typings
- Comprehensive AI tool schema generation and evaluation test fixtures

## [1.1.0] - {PR_MERGE_DATE}

### Added
- Ability to change servers from interface
- Ability to see details about the VPN connection, IP and geo location
- You can refresh the VPN to get the latest details

## [1.0.0] - {PR_MERGE_DATE}

### Added
- Initial release
- Basic VPN connect/disconnect functionality
- Mozilla VPN client integration
- Connection status display
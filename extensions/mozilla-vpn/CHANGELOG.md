# Mozilla VPN Connect Changelog

## [1.2.0] - {PR_MERGE_DATE}

### Added
- 🤖 **AI-Powered Natural Language Commands** - Control your VPN using natural language
- 🔌 **Smart Connection Management** - Connect/disconnect with commands like "Connect to Germany" or "Turn off VPN"
- 📍 **Server Discovery** - List countries, cities, and servers with commands like "Show cities in USA"
- 🔄 **Intelligent Server Switching** - Change servers by country/city with automatic reconnection
- 📊 **Enhanced Status Reporting** - Get VPN status and IP information with "What's my IP?"
- 🌍 **Country Aliases Support** - Understands "USA", "US", "United States", "UK", etc.
- 🔁 **Auto-Retry Logic** - Automatic connection retries (up to 3 attempts) for reliability
- 🎯 **Partial Name Matching** - Find countries/cities with partial names
- ⚡ **Instant Disconnection** - Immediate VPN disconnection without confirmation prompts

### Technical Improvements
- Full TypeScript rewrite with comprehensive type safety
- Reduced console verbosity for cleaner logs
- Modular code architecture with reusable functions
- Robust error handling with helpful user messages
- Optimized connection timing and retry mechanisms

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
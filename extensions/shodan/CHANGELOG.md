# Shodan Changelog

## [1.3.0] - 2025-09-15

### Added
- Search history with persistent storage using LocalStorage
- Recent searches section when no search text is entered
- Clean history display: IP address (title) + search date (subtitle)
- Search history actions: Search Again, Copy IP, Open in Shodan
- Clear history functionality with confirmation
- Automatic deduplication and 20-item limit
- Enhanced user experience for frequent Shodan users

### Features
- Persistent storage across app restarts
- Smart deduplication (moves existing IPs to top)
- Clean, uncluttered history display
- Quick re-search functionality
- History management actions

## [1.2.0] - 2025-09-15

### Added
- Side-by-side detail views with metadata panels
- Enhanced metadata display for host information
- Better information organization and layout
- Improved port details with protocol information
- Banner and header data display in detail views

### Improved
- UI/UX with modern Raycast List component design
- Information hierarchy and readability
- Port information display with TCP/UDP protocols
- Metadata organization for better data presentation

## [1.1.0] - 2025-09-15

### Added
- Comprehensive Shodan integration with 7 commands
- Search Host: Look up IP addresses and hostnames
- Search Shodan: Advanced search with filters and criteria
- Shodan Stats: Search result statistics and breakdowns
- My IP: Look up your external IP address
- API Info: View usage and account information
- On-Demand Scan: Request new scans of specific IPs
- Monitored IPs: View alerts and notifications

### Features
- Complete Shodan API integration
- Secure API key handling via Raycast preferences
- Input validation and sanitization
- Error handling and user feedback
- Copy to clipboard functionality
- Open in Shodan browser integration

## [1.0.0] - 2025-09-15

### Added
- Initial release of Shodan Raycast Extension
- Basic host lookup functionality
- IP address and hostname search capabilities
- Integration with Shodan API
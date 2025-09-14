# IP Finder Changelog

## [1.0.0] - {PR_MERGE_DATE}

### Added
- Initial release of IP Finder Network Scanner
- Network scanning functionality with automatic subnet detection
- IP address discovery and assignment tracking
- Smart recommendations for available IP addresses
- Custom subnet scanning with CIDR notation support
- Cross-platform compatibility (macOS, Windows, Linux)
- Device information gathering (MAC addresses, hostnames, manufacturer details)
- Port scanning with service identification
- Scan history tracking and management
- Export functionality for scan results
- Progress tracking during network scans
- Configurable preferences for timeout, threads, and scan options
- Auto-scan on open functionality
- Detailed network analysis reports

### Features
- **Network Discovery**: Automatically detect and scan local networks
- **IP Management**: Find assigned IPs and get recommendations for available addresses
- **Device Information**: Gather detailed device information including MAC addresses and hostnames
- **Port Scanning**: Detect open ports with service identification
- **Cross-Platform**: Works seamlessly across macOS, Windows, and Linux
- **User-Friendly**: Intuitive interface with progress tracking and detailed results
- **Customizable**: Extensive preference options for different network environments

### Technical Details
- Built with TypeScript and React
- Uses Raycast API for seamless integration
- Implements concurrent scanning with configurable thread limits
- Local storage for scan history and preferences
- No external dependencies or network calls required
- Secure local-only operation

---

*This extension helps network administrators and home users quickly discover devices on their network and find available IP addresses to prevent conflicts.* 
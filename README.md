# IP Finder - Network Scanner

A powerful Raycast extension to scan your local network, detect assigned IP addresses, and get recommendations for available addresses to prevent IP conflicts.

## Features

- **Network Scanning**: Automatically detect your local network and scan for assigned IPs
- **IP Recommendations**: Get smart recommendations for available IP addresses
- **Custom Subnet Scanning**: Scan specific subnets or IP ranges
- **Quick Scan**: Fast network scanning with minimal configuration
- **Cross-Platform**: Works on macOS, Windows, and Linux
- **Scan History**: Keep track of previous scans and results
- **Export Results**: Copy IP lists or export as JSON

## Commands

### Scan Network
The main command that provides a comprehensive interface for network scanning:
- View your local IP and subnet information
- Start automatic network scanning
- Configure custom scan parameters
- View assigned and recommended IPs
- Export results and manage scan history

## Installation

1. Install the extension from the Raycast Store
2. The extension will automatically detect your network configuration
3. No additional setup required - just start scanning!

## Usage

### Basic Network Scan
1. Open Raycast and search for "Scan Network"
2. Click "Start Network Scan" to begin automatic scanning
3. View results showing assigned IPs and recommendations

### Custom Subnet Scan
1. Use "Custom Network Scan" to specify a different subnet
2. Enter subnet in CIDR notation (e.g., `192.168.1.0/24`)
3. Configure timeout and thread settings
4. Start the scan and view results



## Configuration

The extension includes several preferences you can configure:

- **Default Timeout**: Ping timeout in seconds (default: 1.0)
- **Default Max Threads**: Maximum concurrent ping attempts (default: 50)
- **Default Recommendations**: Number of IP recommendations (default: 10)
- **Auto-scan on Open**: Automatically start scanning when opening
- **Show Progress Bar**: Display scanning progress
- **Scan Common Ranges**: Focus on common IP ranges for faster scanning

## Technical Details

- Uses system `ping` commands for cross-platform compatibility
- Supports CIDR notation for subnet specification
- Implements concurrent scanning with configurable thread limits
- Stores scan history locally using Raycast's LocalStorage
- Provides both view and no-view command modes

## Common Use Cases

- **Network Administration**: Quickly identify all devices on your network
- **IP Conflict Prevention**: Find available IPs before assigning static addresses
- **Network Troubleshooting**: Detect connectivity issues and missing devices
- **Home Network Management**: Keep track of connected devices

## Examples

### Common Subnets
- `192.168.1.0/24` - Typical home network
- `10.0.0.0/16` - Large corporate network
- `172.16.0.0/12` - Private network range

### Sample Results
```
Assigned IPs:
- 192.168.1.1 (Router)
- 192.168.1.5 (Your Device)
- 192.168.1.10 (Printer)

Recommended Available IPs:
- 192.168.1.2
- 192.168.1.3
- 192.168.1.4
```

## Privacy & Security

- All scanning is performed locally on your machine
- No network data is sent to external servers
- Scan history is stored locally using Raycast's secure storage
- Uses standard ping commands with no elevated privileges required

## Support

If you encounter any issues or have questions:
1. Check that your network allows ICMP ping packets
2. Ensure you have proper network permissions
3. Try adjusting timeout and thread settings for your network

## Development

This extension is built with:
- TypeScript and React
- Raycast API
- Node.js child_process for ping commands
- Cross-platform compatibility

--- 
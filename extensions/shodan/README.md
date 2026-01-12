# Shodan extension for Raycast

Search the [Shodan](https://www.shodan.io/) database for internet-connected devices, view detailed host information, and manage saved queries directly from [Raycast](https://www.raycast.com/).

## Features

- **Search Shodan** - Execute powerful Shodan queries with real-time results
- **Host Lookup** - Get detailed information for any IP address. Starts with free InternetDB lookup, then optionally load full Shodan data
- **Honeyscore Check** - Verify if an IP is likely a honeypot (available in Host Detail view)
- **Search History** - Automatically track your recent searches with ability to re-run or save as favorites
- **Preset Queries** - Browse 75+ pre-built query templates for webcams, industrial systems, databases, and more
- **Favorite Queries** - Save and organize your most-used search queries
- **DNS Lookup** - Resolve hostnames and perform reverse DNS lookups
- **Exploit Search** - Search the Shodan exploit database (requires paid membership)
- **Network Alerts** - Manage your Shodan network monitoring alerts
- **Account Info** - View API credits and account status

## Setup

1. Install the extension from the Raycast Store
2. Get your Shodan API key from [account.shodan.io](https://account.shodan.io)
3. Enter your API key when prompted (stored securely)

## Commands

| Command          | Description                                                            |
| ---------------- | ---------------------------------------------------------------------- |
| Search Shodan    | Execute Shodan search queries and browse results                       |
| Host Lookup      | Look up IP info (free via InternetDB, optional premium Shodan details) |
| Search History   | View and re-run recent Shodan search queries                           |
| Preset Queries   | Browse pre-built Shodan query templates                                |
| Favorite Queries | View and run saved Shodan queries                                      |
| DNS Lookup       | Resolve hostnames and perform reverse DNS lookups                      |
| Search Exploits  | Search the Shodan exploit database                                     |
| Network Alerts   | Manage network monitoring alerts                                       |
| Account Info     | View API credits and account status                                    |

## Query Examples

```
# Find Apache servers
apache

# Search by country
country:US port:22

# Find specific products
product:nginx

# Search by organization
org:"Google"

# Find vulnerable systems
vuln:CVE-2021-44228
```

## Preset Query Categories

- **Webcams** - Exposed IP cameras and video streams
- **Industrial** - SCADA/ICS systems and PLCs
- **Databases** - MongoDB, Elasticsearch, Redis instances
- **Network** - Routers, switches, and network devices
- **Authentication** - Exposed login panels and authentication services
- **Vulnerabilities** - Known CVEs and security issues
- **IoT** - Smart home devices and IoT systems
- **Cloud** - Cloud services and infrastructure
- **Remote Access** - RDP, VNC, TeamViewer, and SSH services
- **Storage** - NAS, FTP, and file sharing systems
- **Home Automation** - Smart home controllers and devices
- **Printers** - Network-connected printers
- **Misc** - Game servers, development tools, and other devices

## Credits

Preset queries sourced from [advanced-shodan-requests](https://github.com/s-b-repo/advanced-shodan-requests).

Additional inspiration from [awesome-shodan-queries](https://github.com/jakejarvis/awesome-shodan-queries) by Jake Jarvis.

## License

MIT

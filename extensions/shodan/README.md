# Shodan for Raycast

> Search the world's first search engine for Internet-connected devices, directly from [Raycast](https://www.raycast.com/).

[Shodan](https://www.shodan.io/) indexes servers, webcams, routers, IoT devices, industrial control systems, and more. This extension brings Shodan's powerful reconnaissance capabilities to your fingertips.

## Features

### Search & Discovery

- **Search Shodan** — Execute queries with filters, view results with vulnerability indicators
- **Host Lookup** — Free initial lookup via InternetDB, with optional full Shodan scan
- **DNS Lookup** — Resolve hostnames, reverse DNS, subdomain enumeration
- **Exploit Search** — Search Shodan's exploit database (requires membership)

### Organization & History

- **75+ Preset Queries** — Ready-to-use queries across 13 categories
- **Favorite Queries** — Save and organize your most-used searches
- **Search History** — Automatic tracking with quick re-run

### Analysis Tools

- **Honeyscore Check** — Detect potential honeypots (0-100% probability)
- **Vulnerability Display** — CVEs sorted by CVSS severity
- **Screenshot Detection** — Shows count of available screenshots

### Account Management

- **Network Alerts** — Monitor IPs for changes
- **Account Info** — Track API credits and plan status

## Setup

1. Install from the [Raycast Store](https://www.raycast.com/store)
2. Get your API key from [account.shodan.io](https://account.shodan.io)
3. Enter the key when prompted

## Commands

| Command          | Description                                       |
| ---------------- | ------------------------------------------------- |
| Search Shodan    | Query the Shodan database                         |
| Host Lookup      | IP information (InternetDB free, Shodan detailed) |
| Search History   | Re-run recent queries                             |
| Preset Queries   | Browse 75+ pre-built queries                      |
| Favorite Queries | Your saved searches                               |
| DNS Lookup       | DNS resolution & subdomains                       |
| Search Exploits  | Exploit database search                           |
| Network Alerts   | Manage IP monitoring                              |
| Account Info     | View credits & status                             |

## Query Syntax

```bash
# Basic search
apache country:US

# Filter by port and product
port:22 product:OpenSSH

# Organization search
org:"Amazon" port:443

# Vulnerability search
vuln:CVE-2021-44228

# Combined filters
country:DE city:Berlin port:80 http.title:"Dashboard"
```

### Common Filters

| Filter                 | Example                            | Description             |
| ---------------------- | ---------------------------------- | ----------------------- |
| `port:`                | `port:3389`                        | Search by port number   |
| `country:`             | `country:IT`                       | Two-letter country code |
| `city:`                | `city:Rome`                        | City name               |
| `org:`                 | `org:"Telecom Italia"`             | Organization name       |
| `product:`             | `product:nginx`                    | Software/product name   |
| `version:`             | `version:1.19.0`                   | Software version        |
| `os:`                  | `os:"Windows Server"`              | Operating system        |
| `hostname:`            | `hostname:example.com`             | Hostname/domain         |
| `net:`                 | `net:192.168.0.0/24`               | CIDR notation           |
| `vuln:`                | `vuln:CVE-2023-1234`               | CVE identifier          |
| `has_screenshot:`      | `has_screenshot:true`              | Has screenshot          |
| `http.title:`          | `http.title:Login`                 | HTML page title         |
| `http.status:`         | `http.status:200`                  | HTTP status code        |
| `ssl:`                 | `ssl:true`                         | Has SSL/TLS             |
| `ssl.cert.subject.CN:` | `ssl.cert.subject.CN:*.google.com` | SSL certificate CN      |

## Preset Categories

| Category        | Examples                                  |
| --------------- | ----------------------------------------- |
| Webcams         | IP cameras, CCTV, video streams           |
| Industrial      | SCADA, PLCs, Modbus, BACnet               |
| Databases       | MongoDB, Elasticsearch, Redis, CouchDB    |
| Network         | Routers, switches, firewalls              |
| Authentication  | Exposed login panels, default credentials |
| Vulnerabilities | Log4j, EternalBlue, Heartbleed            |
| IoT             | Smart devices, sensors, controllers       |
| Cloud           | AWS, Azure, Kubernetes, Docker            |
| Remote Access   | RDP, VNC, TeamViewer, SSH                 |
| Storage         | NAS, FTP, SMB shares                      |
| Home Automation | Home Assistant, openHAB                   |
| Printers        | Network printers, print servers           |
| Misc            | Game servers, dev tools, misc             |

## Keyboard Shortcuts

| Action            | Shortcut |
| ----------------- | -------- |
| Copy IP           | `⌘ C`    |
| Copy as JSON      | `⌘ ⇧ C`  |
| View on Shodan    | `⌘ O`    |
| Check Honeyscore  | `⌘ ⇧ H`  |
| Save to Favorites | `⌘ S`    |
| Delete            | `⌘ ⌫`    |

**Tip:** Host Lookup uses InternetDB first (free, no credits) before querying Shodan.

## Credits

Preset queries sourced from:

- [advanced-shodan-requests](https://github.com/s-b-repo/advanced-shodan-requests)
- [awesome-shodan-queries](https://github.com/jakejarvis/awesome-shodan-queries)

## License

MIT

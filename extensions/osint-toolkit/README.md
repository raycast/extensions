# OSINT Toolkit

A comprehensive OSINT (Open Source Intelligence) toolkit for Raycast that enables security analysts and researchers to quickly search Indicators of Compromise (IOCs) across multiple threat intelligence platforms.

## Overview

OSINT Toolkit streamlines the process of investigating potential security threats by providing instant access to 15+ leading threat intelligence platforms. Simply paste any IP address, domain, URL, or file hash, and the extension automatically detects the IOC type and presents all relevant OSINT sources.

## Features

### Auto-Detection
- Automatically identifies IOC types: IPv4, IPv6, domains, URLs, and file hashes (MD5, SHA1, SHA256)
- Handles defanged IOCs (e.g., `hxxp://example[.]com`) and automatically refangs them
- Smart validation ensures only valid IOCs are processed

### Favorites System
- Mark frequently used OSINT sources as favorites
- Quick action to open all favorite sources with a single keyboard shortcut
- Favorites persist across sessions

### Multiple Search Options
- Open individual sources
- Open all available sources at once
- Open only your favorite sources
- Copy IOCs in original or defanged format
- Copy search URLs for sharing

### Customizable
- Enable or disable individual OSINT platforms
- Automatic clipboard copy on selection (optional)

## Commands

### Search IOC
The primary command that auto-detects the IOC type and displays all relevant OSINT sources. This is the recommended command for most use cases.

**Usage:**
- Launch with `search ioc`
- Paste any IOC (IP, domain, URL, or hash)
- Results appear automatically as you type

**Keyboard Shortcuts:**
- `Enter` - Open selected source in browser
- `Cmd+F` - Add/Remove source from favorites
- `Cmd+Opt+O` - Open all favorite sources
- `Cmd+Shift+O` - Open all available sources
- `Cmd+C` - Copy search URL
- `Cmd+Shift+C` - Copy IOC
- `Cmd+Opt+C` - Copy defanged IOC

Note: Keyboard modifier keys use the platform-native modifier (use `Cmd` on macOS and `Ctrl` on Windows).

The Raycast command title is "Search IOC" (internal command id: `search-ioc`).

## Supported Platforms
- macOS and Windows

### Multi-Purpose Platforms
- **VirusTotal** - Analyze files, URLs, domains, and IP addresses
- **AlienVault OTX** - Open Threat Exchange collaborative intelligence
- **Pulsedive** - Free threat intelligence platform
- **Kaspersky OpenTIP** - Kaspersky threat intelligence (hash only)

### IP Intelligence
- **AbuseIPDB** - IP address threat intelligence and blacklist service
- **Shodan** - Search engine for internet-connected devices
- **ipinfo.io** - Comprehensive IP address data
- **GreyNoise** - Internet background noise intelligence

### URL and Domain Analysis
- **URLScan.io** - Website scanner and domain investigation
- **WebCheck** - All-in-one website analysis tool
- **WHOIS** - Domain registration information lookup

### Malware Analysis
- **Hybrid Analysis** - Free automated malware analysis
- **Joe Sandbox** - Advanced malware analysis (hash and IP)
- **MalwareBazaar** - Malware sample sharing platform
- **threat.rip** - Fast threat intelligence for file hashes

### Threat Intelligence
- **ThreatFox** - IOC sharing platform by abuse.ch
- **IBM X-Force Exchange** - Threat intelligence sharing platform

### Certificate and SSL
- **Censys** - Internet-wide search for devices and certificates
- **crt.sh** - Certificate transparency log search

## Installation

1. Open Raycast
2. Search for "Store" and open the Extension Store
3. Search for "OSINT Toolkit"
4. Click "Install"

## Configuration

### Enabling/Disabling Sources

You can enable or disable individual OSINT platforms in the preferences:

1. Open Raycast preferences (Cmd+,)
2. Navigate to Extensions > OSINT Toolkit
3. Toggle checkboxes for each platform

### Additional Settings

- **Copy IOC on Selection** - Automatically copy the IOC to clipboard when opening a source

## Usage Examples

### Searching an IP Address
1. Launch "Search IOC"
2. Paste: `8.8.8.8`
3. View results from AbuseIPDB, Shodan, VirusTotal, and other IP-focused platforms

### Searching a File Hash
1. Launch "Search IOC"
2. Paste: `44d88612fea8a8f36de82e1278abb02f` (MD5 example)
3. View results from VirusTotal, MalwareBazaar, Hybrid Analysis, and other malware analysis platforms

### Searching a Domain
1. Launch "Search IOC"
2. Paste: `example.com`
3. View results from URLScan, VirusTotal, WHOIS, and other domain analysis platforms

### Using Favorites
1. Open any IOC search
2. Press `Cmd+F` on your preferred sources to mark as favorites
3. Next time, press `Cmd+Opt+O` to open all your favorites at once

## Privacy and Security

- No IOC data is stored or transmitted to third parties
- All searches open directly in your browser
- The extension only constructs search URLs; actual queries are performed by your browser
- All OSINT platforms are accessed via their public web interfaces

## Contributing

This extension is open source. Contributions, bug reports, and feature requests are welcome.

## License

MIT License

## Support

For issues, questions, or feature requests, please visit the GitHub repository or contact the author through Raycast.

## Acknowledgments

This extension integrates with the following OSINT platforms. All trademarks and service marks are the property of their respective owners:
- VirusTotal, AbuseIPDB, Shodan, AlienVault OTX, URLScan.io, WebCheck, WHOIS, Hybrid Analysis, Joe Sandbox, MalwareBazaar, ThreatFox, threat.rip, IBM X-Force Exchange, Pulsedive, Kaspersky OpenTIP, GreyNoise, ipinfo.io, Censys, and crt.sh.


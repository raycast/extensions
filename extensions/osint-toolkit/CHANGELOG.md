# OSINT Toolkit Changelog

All notable changes to the OSINT Toolkit extension will be documented in this file.

The format is based on Keep a Changelog, and this project adheres to Semantic Versioning.

## [1.0.0] - {PR_MERGE_DATE}

### Added
- Initial release of OSINT Toolkit extension
- Auto-detection of IOC types: IPv4, IPv6, domains, URLs, and file hashes (MD5, SHA1, SHA256)
- Support for defanged IOCs with automatic refanging
- Unified Search IOC command with automatic type detection
- Favorites system for frequently used OSINT sources
- Quick action to open all favorite sources with keyboard shortcut
- Quick action to open all available sources at once
- Support for 15 OSINT platforms:
  - VirusTotal - Multi-purpose threat intelligence
  - AlienVault OTX - Open Threat Exchange
  - Pulsedive - Free threat intelligence platform
  - Kaspersky OpenTIP - Kaspersky threat intelligence (hash only)
  - AbuseIPDB - IP address threat intelligence
  - Shodan - Internet-connected device search
  - ipinfo.io - IP address data and geolocation
  - GreyNoise - Internet background noise intelligence
  - URLScan.io - Website scanner and domain investigation
  - WebCheck - All-in-one website analysis
  - WHOIS - Domain registration information
  - Hybrid Analysis - Automated malware analysis
  - Joe Sandbox - Advanced malware analysis platform
  - MalwareBazaar - Malware sample sharing
  - threat.rip - File hash threat intelligence
  - ThreatFox - IOC sharing platform by abuse.ch
  - IBM X-Force Exchange - Threat intelligence sharing
  - Censys - Internet-wide device and certificate search
  - crt.sh - Certificate transparency log search
- Cross-platform support for macOS and Windows
- Configurable preferences:
  - Enable or disable individual OSINT platforms
  - Auto-copy IOC to clipboard on selection
- Multiple copy options:
  - Copy search URL
  - Copy IOC in original format
  - Copy defanged IOC for safe sharing
- Smart URL building with platform-specific parameters:
  - Joe Sandbox uses hash-type-specific parameters (md5, sha1, sha256)
  - Pulsedive uses base64-encoded IOCs
  - Platform-specific search query formats
- Visual indicators for favorite sources
- Persistent favorites using Raycast LocalStorage
- Keyboard shortcuts for all major actions
- All platforms accessed via public web interfaces without requiring authentication

### Technical Details
- Built with TypeScript and React
- Uses Raycast API 1.69.0
- Follows Raycast extension guidelines
- ESLint and Prettier code quality checks
- Cross-platform compatible code with no OS-specific dependencies


# OSINT Toolkit Changelog

## [1.0.0] - {PR_MERGE_DATE}

### Added

- Initial release of OSINT Toolkit extension
- Auto-detection of IOC types (IPs, domains, URLs, hashes)
- Support for 15+ OSINT platforms:
  - VirusTotal
  - AbuseIPDB
  - Shodan
  - AlienVault OTX
  - URLScan.io
  - ThreatFox
  - Hybrid Analysis
  - ANY.RUN
  - Pulsedive
  - ipinfo.io
  - WebCheck
  - ThreatCrowd
  - Kaspersky OpenTIP
  - threat.rip
  - IBM X-Force Exchange
- Unified search command with automatic IOC type detection
- Individual commands for each IOC type (IP, Domain, URL, Hash)
- Support for MD5, SHA1, and SHA256 hashes
- Support for both IPv4 and IPv6 addresses
- Quick actions: Open in browser, Copy URL, Copy IOC
- Configurable preferences for API keys
- Toggle individual OSINT sources on/off
- Free lookup URLs for platforms that support it
- Import custom OSINT sources via JSON (local storage)

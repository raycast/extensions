# OSINT Web Check Changelog

## [Merge Search IOC into OSINT Web Check] - 2026-06-21

- Single "OSINT Web Check" command now accepts URLs, domains, IPs, and hashes in one search bar.
- Deep-dive checks (DNS, SSL, ports, headers, etc.) appear as a single detail panel alongside external OSINT platform lookups.
- Removed the separate "Search IOC" command.

## [Add Search IOC command] - {PR_MERGE_DATE}

- Added new "Search IOC" command that auto-detects and searches IOCs (IPs, domains, URLs, hashes) across 18 OSINT platforms (VirusTotal, AbuseIPDB, Shodan, AlienVault OTX, URLScan, Hybrid Analysis, etc.).
- Added 18 source toggle preferences and a "Copy IOC on Open" preference for the new command.

## [Security.txt Support] - 2024-01-18

- Added support for fetching and parsing security.txt files.

## [Initial Version] - 2023-12-28

- Initial web check functionality, entering URL and checking OSINT information.
- Display IP Information
- Display DNSSEC Information
- Display SSL Information
- Display DNS Information
- Display Open Ports
- Display TXT Records
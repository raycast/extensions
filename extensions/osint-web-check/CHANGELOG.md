# OSINT Web Check Changelog

## [Consolidate OSINT Toolkit into OSINT Web Check] - 2026-06-22

- Single "OSINT Web Check" command now accepts URLs, domains, IPs, and hashes in one search bar.
- Deep-dive checks (DNS, SSL, ports, headers, etc.) appear as a single detail panel alongside external OSINT platform lookups.
- Removed the separate "OSINT Toolkit" extension and its "Search IOC" command.
- Added 14 OSINT source toggle preferences for the platforms now exposed inside OSINT Web Check (VirusTotal, AbuseIPDB, Shodan, AlienVault OTX, URLScan, Pulsedive, Kaspersky OpenTIP, ipinfo, GreyNoise, WHOIS, MalwareBazaar, Censys, crt.sh, WebCheck).

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

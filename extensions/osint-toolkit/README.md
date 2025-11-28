# OSINT Toolkit

Search IOCs (IPs, domains, URLs, hashes) across 25+ threat intelligence platforms directly from Raycast.

## Features

- **Auto-detect IOC types**: Automatically identifies IPs, domains, URLs, and file hashes
- **25+ OSINT platforms**: VirusTotal, Shodan, AbuseIPDB, AlienVault OTX, URLScan.io, and more
- **Keyboard-first workflow**: Navigate and search without touching the mouse
- **Customizable sources**: Enable/disable individual OSINT platforms
- **Optional API keys**: Enhanced features for platforms that support them
- **Smart defanging**: Automatically handles defanged IOCs

## Commands

- `Search IOC` - Auto-detect and search any IOC type
- `Search IP Address` - Search IP addresses
- `Search Domain` - Search domains
- `Search URL` - Search URLs
- `Search File Hash` - Search file hashes (MD5, SHA1, SHA256)
- `Import Custom Source` - Add your own OSINT source by pasting its JSON into a form

## Supported Platforms

### Multi-Purpose

VirusTotal, AlienVault OTX, Pulsedive, Kaspersky OpenTIP

### IP Intelligence

AbuseIPDB, Shodan, ipinfo.io, GreyNoise, IPQualityScore

### URL/Domain Analysis

URLScan.io, WebCheck, WHOIS, SecurityTrails

### Malware Analysis

Hybrid Analysis, ANY.RUN, Joe Sandbox, MalwareBazaar

### Threat Intelligence

ThreatFox, ThreatCrowd, threat.rip, IBM X-Force Exchange

### Certificate/SSL

Censys, crt.sh

## Configuration

Optional API keys can be configured in Raycast preferences for enhanced features:

- VirusTotal
- AbuseIPDB
- Shodan
- AlienVault OTX
- URLScan.io

All platforms support free lookups without API keys.

## Custom Sources
You can add your own custom OSINT sources via the `Import Custom Source` command. Provide a JSON object with fields: `id`, `name`, `description`, `url` (use `
${ioc}
` as a placeholder for IOC insertion), `category` (one of: `Multi-Purpose`, `IP Intelligence`, `URL/Domain Analysis`, `Malware Analysis`, `Threat Intelligence`, `Certificate/SSL`), `supportedTypes` (array of supported IOC types), `requiresAuth`, `isFree`, and an optional `icon` string.

Example JSON:

```json
{
  "id": "my-source",
  "name": "My Source",
  "description": "Custom OSINT source",
  "url": "https://example.com/search?q=${ioc}",
  "category": "Multi-Purpose",
  "supportedTypes": ["ip", "domain", "url"],
  "requiresAuth": false,
  "isFree": true,
  "icon": "globe"
}
```

Custom sources are stored locally and will appear alongside bundled sources in the search results. You can update or re-import an existing source (same id) to overwrite it.

## Privacy & Data Handling

- This extension does not transmit the IOCs or any scanned data to external servers by itself — it only opens the vendors' websites in your browser.
- Optional API keys are stored in Raycast preferences (encrypted by Raycast). The extension does not send those keys to any external service other than the service you choose to open.
- Recent IOCs are stored locally in your Raycast LocalStorage and are not transmitted or shared by this extension.


## Installation

1. Install the extension from Raycast Store
2. (Optional) Configure API keys for enhanced features in Raycast preferences
3. Start searching IOCs using the commands or pass them as arguments


- You may want to create a PR and run CI (e.g., Codacy) before publishing.
- Raycast may require a review of your extension before it's listed — follow the Raycast docs for additional steps.


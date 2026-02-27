# Security Digest

A Raycast extension for daily cybersecurity news digest with AI-powered summaries.

## Features

- 📰 **Daily Digest** - Quick access to the latest security news
- 🤖 **AI Summaries** - Optional AI-powered article summaries (OpenAI/Claude/Gemini)
- 📂 **Smart Categorization** - Auto-categorize: Vulnerability, Threat Intel, Research, Tools, Incidents, News
- 🔗 **CVE Merging** - Automatically merge multiple sources for the same CVE
- ⚡ **Fast & Lightweight** - Built with Raycast's native UI components

## Installation

1. Clone this repository
2. Run `npm install`
3. Run `npm run dev` for development
4. Run `npm run build` and `npm run publish` to submit to Raycast Store

## Configuration

### Preferences

| Setting | Description | Default |
|---------|-------------|---------|
| OPML URL | URL to OPML file with RSS feeds | Built-in feeds |
| Time Window | Hours back to fetch news | 24 |
| Max Items | Maximum items to display | 50 |
| Max Feeds | Maximum feeds to fetch | 20 |

### Built-in Feeds

The extension includes curated security feeds:

- **Vulnerability**: NVD, CISA Alerts, Exploit-DB
- **Threat Intel**: Krebs on Security, Unit42, VirusTotal
- **Research**: Google Project Zero, Trail of Bits, NCC Group
- **News**: The Hacker News, BleepingComputer, Dark Reading, SecurityWeek
- **Vendor**: Microsoft Security, Cloudflare

### Custom OPML

You can use the [CyberSecurityRSS](https://github.com/zer0yu/CyberSecurityRSS) OPML for 700+ security feeds:

```
https://raw.githubusercontent.com/zer0yu/CyberSecurityRSS/master/tiny.opml
```

## Commands

### Daily Security Digest

View today's security news with:
- Category filter dropdown
- Search functionality
- Quick actions: Open in Browser, Copy Markdown Link, Copy URL

### Manage Sources

Configure your feed sources:
- Add custom RSS feeds
- Load feeds from OPML URL
- Reset to default feeds

## Related Projects

- [CyberSecurityRSS](https://github.com/zer0yu/CyberSecurityRSS) - Curated security RSS feeds
- [sec-daily-digest](https://github.com/zer0yu/sec-daily-digest) - Daily digest generator

## License

MIT
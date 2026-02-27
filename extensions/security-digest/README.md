# <img src="assets/shield-icon.png" width="32" height="32" /> Security Digest

A Raycast extension for daily cybersecurity news digest with optimized fetching and streamlined categorization.

<p align="center">
  <img src="metadata/1.png" width="350" alt="Security Digest Screenshot 1" />
  <img src="metadata/2.png" width="350" alt="Security Digest Screenshot 2" />
</p>

## Features

- 📰 **Daily Digest** - Quick access to the latest security news
- 📂 **Smart Categorization** - Streamlined categories: Vulnerability, Intelligence, and News
- 🔗 **CVE Merging** - Automatically merge multiple sources for the same CVE
- ⚡ **Optimized Performance** - Chunked parallel fetching and memory-efficient RSS parsing

## Installation

1. Clone this repository
2. Run `npm install`
3. Run `npm run dev` for development
4. Run `npm run build` and `npm run publish` to submit to Raycast Store

## Configuration

### Preferences

| Setting     | Description                     | Default        |
| ----------- | ------------------------------- | -------------- |
| OPML URL    | URL to OPML file with RSS feeds | Built-in feeds |
| Time Window | Hours back to fetch news        | 24             |
| Max Items   | Maximum items to display        | 50             |
| Max Feeds   | Maximum feeds to fetch          | 20             |

### Built-in Feeds

The extension includes a curated list of reliable security feeds classified into three core areas:

- **Vulnerability**: CISA Alerts, Exploit-DB
- **Intelligence**: Krebs on Security, Google Project Zero, Unit42, Microsoft Security, Cloudflare Blog
- **News**: The Hacker News, BleepingComputer, Dark Reading, SANS Internet Storm Center

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

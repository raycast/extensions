# Digger

**Like `dig`, but for the web.** Comprehensive website intelligence and metadata extraction for Raycast.

<div align="center">
  <img src="assets/digger.png" width="128" height="128" alt="Digger icon">
</div>

<div align="center">
  <a href="https://www.raycast.com/chrismessina/digger">
    <img src="https://img.shields.io/badge/Raycast-Store-red.svg" alt="Digger on Raycast Store">
  </a>
  <a href="https://github.com/chrismessina/raycast-digger/stargazers">
    <img src="https://img.shields.io/github/stars/chrismessina/raycast-digger?style=social" alt="Stars">
  </a>
  <a href="https://github.com/chrismessina">
    <img src="https://img.shields.io/github/followers/chrismessina?label=Follow&style=social" alt="Follow @chrismessina">
  </a>
</div>

---

Digger surfaces contextual information about any website without needing to open developer tools. Enter a URL and instantly see metadata, SEO signals, security info, DNS records, and more.

## Features

### Overview

- Page title, description, and language
- Character encoding detection
- Bot protection/WAF detection (Cloudflare, Akamai, AWS WAF, etc.)

### Metadata & Semantics

- Open Graph tags for social sharing
- Twitter Card metadata
- JSON-LD structured data
- All meta tags at a glance

### Discoverability

- Robots meta directives
- Canonical URL
- Sitemap detection and viewer
- robots.txt and llms.txt detection
- Content-Signal directives (from robots.txt)
- Payment Required (x402) detection — HTTP 402 status code and payment protocol headers
- Alternate/hreflang links

### Resources & Assets

- Stylesheets and scripts
- Favicon, Apple Touch Icons, and Open Graph images
- Font detection (Google Fonts, Adobe Fonts, Bunny Fonts, Fontshare, Fonts.com, Font Awesome, custom)
- Theme color

### HTTP Headers

- View all response headers
- Security headers audit (CSP, HSTS, X-Frame-Options, etc.)
- Server identification
- HTTP status code
- HTTP 402 status code and payment protocol headers

### DNS & Certificates

- A, AAAA, MX, TXT, NS, and CNAME records
- TLS certificate chain information
- Certificate expiration dates

### Wayback Machine

- Total snapshot count
- First and last capture dates
- Quick link to Internet Archive
- Integration with [Wayback Machine extension](https://www.raycast.com/pernielsentikaer/wayback-machine)

### Data Feeds & API

- RSS, Atom, and JSON feed detection
- JSON-LD structured data viewer
- Host metadata discovery (RFC 6415 XRD/JRD)

### Quick Input Options

Configure these in Raycast preferences (`⌘ ,`):

| Option                           | Description                                                                                                       |
| -------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| **Auto Load from Clipboard**     | Automatically analyze URLs copied to clipboard                                                                    |
| **Auto Load from Selected Text** | Analyze highlighted URLs in any app                                                                               |
| **Browser Extension Support**    | Analyze the current browser tab (requires [Raycast Browser Extension](https://www.raycast.com/browser-extension)) |

### Keyboard Shortcuts

| Shortcut  | Action                    |
| --------- | ------------------------- |
| `↑` / `↓` | Navigate between sections |
| `⌘ R`     | Refresh data              |
| `⌘ C`     | Copy URL                  |
| `⌘ ⇧ J`   | Copy as JSON              |
| `⌘ ⇧ M`   | Copy as Markdown          |
| `⌘ O`     | Open in browser           |

## Examples

Digger is useful for:

- **SEO audits** — Check meta tags, canonical URLs, and structured data
- **Competitive analysis** — See what technologies competitors use
- **Debugging** — Inspect headers, redirects, and DNS records
- **Security research** — View certificate chains and security headers
- **Content discovery** — Find RSS feeds, sitemaps, and API endpoints

## Privacy

Digger fetches websites directly from your machine. No data is sent to third-party servers except:

- **Wayback Machine API** — To retrieve archive history
- **DNS lookups** — Standard system DNS resolution

## Troubleshooting

### Bot protection detected

Some websites use Cloudflare, Akamai, or similar services that may block or challenge automated requests. Digger will indicate when this happens.

### Slow loading

- Large websites may take longer to analyze
- Wayback Machine API can be slow or rate-limited during peak times

## Contributing

[Contributions](https://developers.raycast.com/basics/contribute-to-an-extension) are welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Submit a pull request

For bugs or feature requests, [open an issue](https://github.com/chrismessina/raycast-digger/issues).

## Credits

Built by [Chris Messina](https://github.com/chrismessina) and his robot helpers.

Uses:

- [Cheerio](https://cheerio.js.org/) for HTML parsing
- [Wayback Machine API](https://archive.org/help/wayback_api.php) for archive data

## License

MIT License — see [LICENSE](LICENSE) for details.

---

<div align="center">
  <p>If you find Digger helpful, consider supporting development:</p>
  <a href="https://ko-fi.com/chris">
    <img src="https://img.shields.io/badge/Ko--fi-Support-ff5f5f?logo=ko-fi&logoColor=white" alt="Support on Ko-fi">
  </a>
</div>

# Reader Mode

<div align="center">
  <a href="https://github.com/chrismessina">
    <img src="https://img.shields.io/github/followers/chrismessina?label=Follow%20chrismessina&style=social" alt="Follow @chrismessina">
  </a>
  <a href="https://github.com/chrismessina/raycast-reader/stargazers">
    <img src="https://img.shields.io/github/stars/chrismessina/raycast-reader?style=social" alt="Stars">
  </a>
  <a href="https://www.raycast.com/chrismessina/reader-mode">
    <img src="https://img.shields.io/badge/Raycast-Store-red.svg" alt="Reader Mode on Raycast store.">
  </a>
</div>

Read the web distraction-free in Raycast.

## Quick Start

**Usage:**

1. Once installed, open Raycast and type `reader` (or use your chosen alias)
2. Paste a URL, or let Reader Mode detect URLs from:
   - Your clipboard
   - Selected text
   - The active browser tab (if you have the [Raycast browser extension](https://www.raycast.com/browser-extension) installed)
3. Reader Mode extracts and displays the article with an optional AI summary

**Keyboard shortcuts:**

- `⌘ + C` — Copy article as Markdown
- `⌘ + ⇧ + C` — Copy summary
- `⌘ + O` — Open original URL in browser
- `⌘ + ⇧ + R` — Import from browser tab (for paywalled content)

## Features

- **Clean Reading Experience** — Extracts article content and removes distractions
- **AI Summaries** — Multiple summary styles powered by Raycast AI
- **Article Images** — Optionally display featured image (toggle in preferences)
- **Browser Extension Fallback** — Access blocked pages and re-import member-only content via the [Raycast browser extension](https://www.raycast.com/browser-extension)
- **Smart URL Detection** — Automatically detects URLs from arguments, clipboard, selection, or active browser tab
- **Paywall Bypass** — Attempts to retrieve paywalled content via archive services

## Summary Styles

Reader Mode offers seven AI-powered summary styles accessible via the action panel:

| Style | Description | Best For |
| ------- | ------------- | ---------- |
| **Overview** | One-liner + 3 key bullet points | Quick scanning of news and articles |
| **Arc-style Summary** | Detailed, fact-specific summary (4-7 points) | Long articles needing comprehensive summaries |
| **Opposing Sides** | Two contrasting perspectives | Opinion pieces and debates |
| **The 5 Ws** | Who, What, Where, When, Why breakdown | News stories and event coverage |
| **Explain Like I'm 5** | Simplified, friendly explanation | Complex or technical content |
| **Translated Overview** | Overview in 20+ languages | Language learning and international readers |
| **People, Places & Things** | Key entities with context | Articles with many named entities |

Change summary styles via the action panel (`⌘ + K`) or set a default in preferences.

## For Contributors

See [CONTRIBUTING.md](CONTRIBUTING.md) for architecture details, development setup, and contribution guidelines.

## Browser Extension Integration

Reader Mode integrates with the [Raycast browser extension](https://www.raycast.com/browser-extension) to handle blocked pages and access authenticated content.

### Handling Blocked Pages

Some websites (like Politico, Bloomberg, etc.) use bot detection that prevents direct content fetching. When this happens, Reader Mode automatically offers a browser extension fallback:

**How It Works:**

1. **Detection** - When a 403 "Access Denied" error occurs, Reader Mode checks if you have the Raycast browser extension installed
2. **Instructions** - Shows a friendly message with clear steps to access the content
3. **Browser Fallback** - You can open the page in your browser and fetch content via the extension

**Usage:**

1. Press **Enter** to open the URL in your browser
2. Wait for the page to fully load
3. Press **⌘ + R** to fetch the content via the Raycast browser extension
4. The article loads normally with full content

### Re-importing Member-Only Content

For paywalled or member-only articles (like Medium member stories), you can re-import content from an authenticated browser session:

**When to Use:**

- Medium member-only articles
- Paywalled content from news sites
- Any article requiring authentication to view full content

**How It Works:**

1. Open the article in Reader Mode (you'll see a truncated or blocked version)
2. Press **⌘ + ⇧ + R** to trigger "Import from Browser Tab"
3. Reader Mode finds the matching browser tab using the article's canonical URL
4. If the tab is inactive, you'll be prompted to focus it first
5. Content is re-imported with your authenticated session, showing the full article

**Requirements:**

- [Raycast browser extension](https://www.raycast.com/browser-extension) must be installed
- The article must be open in a browser tab
- You must be logged in to the site in your browser
- The browser tab must be active (focused) when importing

### Inspiration: Defuddle

This extension's content extraction architecture was inspired by [Defuddle](https://github.com/kepano/defuddle), a content extraction library by [@kepano](https://github.com/kepano). We initially attempted to use Defuddle directly, but found it wasn't well-suited for Raycast's environment:

- **DOM Environment**: Defuddle expects a browser DOM, while Raycast extensions run in Node.js with `linkedom`
- **Bundle Size**: Defuddle's full feature set added unnecessary weight for our use case
- **Output Format**: We needed tighter integration with our metadata extraction and markdown conversion pipeline

Instead, we adopted Defuddle's excellent patterns:

- **Site-specific extractors** with a clean base class architecture
- **Schema.org JSON-LD parsing** for rich metadata extraction
- **Fallback chains** for metadata (Schema.org → Open Graph → Twitter Cards → meta tags)
- **Comprehensive cleanup selectors** for removing ads, navigation, and other distractions

This hybrid approach gives us the best of both worlds: Defuddle's battle-tested extraction patterns with tight Raycast integration.

## References

- [Mozilla Readability](https://github.com/mozilla/readability) - Core content extraction
- [Defuddle](https://github.com/kepano/defuddle) - Inspiration for extractor architecture
- [Turndown](https://github.com/mixmark-io/turndown) - HTML to Markdown conversion
- [Raycast API Docs](https://developers.raycast.com)
- [Logger Integration Guide](./docs/logger-integration.md)

---

## Credits

Built by [Chris Messina](https://github.com/chrismessina).

Uses:

- [Cheerio](https://cheerio.js.org/) for HTML parsing
- [Wayback Machine API](https://archive.org/help/wayback_api.php) for archive data

## License

MIT License — see [LICENSE](LICENSE) for details.

---

<div align="center">
  <p>If you find Reader Mode helpful, feel free to buy me a coffee!</p>
  <a href="https://ko-fi.com/chris">
    <img src="https://img.shields.io/badge/Ko--fi-Support-ff5f5f?logo=ko-fi&logoColor=white" alt="Support on Ko-fi">
  </a>
</div>

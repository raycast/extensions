# Digger Changelog

## [Add Content Signals and Payment Required (x402) detection] - 2026-02-19

### Added: Content Signals detection

- Digger now parses [Content-Signal](https://contentsignals.org/) directives from robots.txt and displays them in the Discoverability section

### Added: Payment Required (x402) detection

- Digger now detects [x402](https://www.x402.org/) payment-required signals from HTTP responses and surfaces them in two places:
  - **Discoverability** section: primary indicator showing which signals were found (HTTP 402 status code, `PAYMENT-REQUIRED` header, `PAYMENT-RESPONSE` header)
  - **HTTP Headers** section: supporting detail listing the raw values of x402 protocol headers
- Payment Required signals are included in the Markdown report export (`⌘ ⇧ M`)

### Added: Favicon display

- Digger now displays the favicon as the Overview icon when available (thx @jlokos for [#1](https://github.com/chrismessina/raycast-digger/pull/1))

### Improved: URL processing

- Enhanced URL extraction and normalization across all input sources (argument, clipboard, selected text, browser extension):
  - Improved `extractUrl()` to handle trailing punctuation (e.g., `https://example.com.` → `https://example.com`)
  - Added validation to extracted URLs to ensure only valid URLs are accepted
  - Fixed priority order: bare domains like `example.com` are now preferred over embedded URLs in mixed input
  - Browser extension tab URLs now benefit from the same extraction logic as other sources
  - `normalizeUrl()` now properly lowercases scheme and hostname via URL parsing

### Changed: Screenshots and dependencies

- Updated screenshots
- Updated dependencies

## [Initial Version] - 2026-01-27

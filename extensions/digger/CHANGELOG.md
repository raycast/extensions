# Digger Changelog

## [Add Content Signals and Payment Required (x402) detection] - {PR_MERGE_DATE}

### Added

- **Content Signals detection** — Digger now parses [Content-Signal](https://contentsignals.org/) directives from robots.txt and displays them in the Discoverability section
- **Payment Required (x402) detection** — Digger now detects [x402](https://www.x402.org/) payment-required signals from HTTP responses and surfaces them in two places:
  - **Discoverability** section: primary indicator showing which signals were found (HTTP 402 status code, `PAYMENT-REQUIRED` header, `PAYMENT-RESPONSE` header)
  - **HTTP Headers** section: supporting detail listing the raw values of x402 protocol headers
- Payment Required signals are included in the Markdown report export (`⌘ ⇧ M`)

## [Initial Version] - 2026-01-27

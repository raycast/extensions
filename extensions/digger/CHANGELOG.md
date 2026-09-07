# Digger Changelog

## [Report failed DNS, certificate, Wayback and host-metadata lookups] - 2026-09-03

### Added

- The Overview row now shows the site's own favicon as soon as it decodes, falling back to a globe rather than sitting on a chain icon while a third-party favicon lookup runs.
- Host metadata (`/.well-known/host-meta`) now appears under Data Feeds & API. It was being fetched and cached on every dig but rendered nowhere, so the result was invisible even when it succeeded.

### Changed

- Updated to Raycast API 2.x.
- A lookup that fails now says so in its own section — DNS, SSL certificate, Wayback and host metadata each read "Couldn't check" — instead of a single truncated banner row at the top of the list. A toast announces it once. Because the statuses travel with the result, a cached dig still explains itself.

### Fixed

- A failed DNS, SSL certificate, Wayback Machine or host-metadata lookup rendered an empty section with nothing saying why. Those failures are now listed in the "Some data couldn't be loaded" banner, with the underlying cause.
- A dig that came back empty is no longer cached. A site answering an unhappy status with no body — a bot-block or an edge error — parsed into a result with no title, resources or metadata, and caching it pinned that empty view for the full 48-hour TTL, so re-running the command changed nothing.
- A non-2xx status is now marked in Overview. Only 200 carried an indicator, so an error status read like a normal result next to an empty page.
- "Refresh" now actually refreshes. It read straight through the cache, so on a stale or broken result — exactly when a user reaches for it — it re-rendered the same result and looked like the action did nothing. It now re-digs the site, bypassing the cache. Other digs still use the cache, and a failed refresh does not discard the cached copy — re-running the command still finds it.
- The Markdown report claimed to include TTFB and a request count, but neither was ever measured, so those lines could never appear. The dead branches and the unpopulated fields behind them are gone.
- A DNS lookup that failed outright now says so on every record row. It added a "Couldn't check" line at the top of the section while the six rows beneath it still read "No IPv4 addresses found", "No mail servers found" and so on — absences from queries that never returned.
- Each DNS record type now reports its own outcome. A host can answer for one type and fail on another — an A record found while the MX query times out — and the failed row said "No mail servers found", a claim about the host from a query that never returned. Those rows now read "Couldn't check".
- A DNS section that couldn't be checked no longer reads as a host with no records. This covers every way the lookup can fail, not a handful of named ones — a malformed resolver response or an out-of-memory error now reads "Couldn't check" like a timeout does. If the first record type came back empty — normal, plenty of hosts publish no AAAA or MX — and the resolver then failed on everything after it, only that first harmless result was kept and the section reported "no records found" for a lookup that never completed.
- The Wayback Machine section no longer invents a snapshot count. When the precise-count request failed — and archive.org times out often — it fell back to a formula meant for huge archives, reporting a site with 8 snapshots as 5,000, labelled an estimate. It now says "Couldn't check".
- A Wayback lookup is bounded and cancellable. Its four sequential requests each retried independently with no shared limit, so an unresponsive archive.org could hold the section for over a minute; and a dig you replaced kept fetching for a result nobody would see. The whole lookup now shares one budget and stops as soon as its dig is superseded.
- robots.txt, llms.txt and sitemap.xml no longer report "Not found" when the check itself failed. A 5xx, a timeout or a refused connection now reads "Couldn't check" in that row, and rows read "Checking…" until the request comes back. Only an answer from the server — a 404 or a 410, or for robots.txt and llms.txt a page that is really an error page — says the file is absent.

## [Failed digs no longer hang, and shortcuts work on Windows] - 2026-08-11

### Fixed

- A dig that failed outright — an unreachable host, a mistyped domain — left the spinner running forever and never showed an error. It now reports the failure immediately.
- Errors identify the actual problem. A DNS failure now reads "Connection Failed" with connection-specific advice and the underlying cause, instead of a generic "Fetch Error".
- Keyboard shortcuts now work on Windows. Every custom shortcut previously used a ⌘-based binding that does not exist there, leaving those actions unreachable.
- In the HTTP Headers list, "Copy Header Name" and "Copy Header Value" were both bound to ⌘ ⇧ C, so one of them could never be triggered. "Copy Header Name" now uses ⌘ ⌥ C.
- Digging a new URL before the previous one finished could let the abandoned dig overwrite the new results, blank its panels, or fill its progress bars.
- DNS & Certificates no longer shows the previous site's certificate when the current site's TLS lookup fails.
- "Open in Wayback Machine" and "Save to Wayback Machine" now open the correct app when running Raycast beta.

### Added

- **Copy Error** on the failure toast and **Copy Error Details** on the error screen, both copying the same report: the URL, the underlying cause, and the suggestions.
- **Copy Error Details** on the "Some data couldn't be loaded" banner, for the individual component failures.

### Changed

- The failure screen is now a centred empty state rather than a list row with a detail pane beside it.
- "Save to Wayback Machine" moved from ⌘ ⇧ S to ⌘ ⇧ Y, and "Copy Canonical URL" from ⌘ ⌥ C to ⌘ ⌥ U, so they no longer shadow Raycast's standard shortcuts.
- URLs written to the debug log are stripped of their query strings.

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

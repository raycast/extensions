# Security

Cyber Security Pulse is a client-only Raycast extension: it fetches RSS feeds,
classifies the items, and renders them. There is no backend, no account, no
secrets, and no data leaves your machine except the requests to the feeds you
configure. This document describes the trust boundary and the controls in place.
The detailed decision record is [ADR-0006](docs/architecture/adrs/0006-security-hardening-for-publish.md).

## Data flow

```
RSS feeds (untrusted)  ──HTTP(S)──▶  rss-parser  ──▶  classify/score  ──▶  Raycast UI
                                                                          ├─ Open in Browser
        Preferences (feeds, watchlist,                                    └─ Copy to clipboard
        extra keywords, denylist)  ──────────────▶  parsing/matching
```

- **Only untrusted input is feed content** (titles, summaries, links) and the
  user's own preference strings.
- The extension runs entirely on the user's machine inside Raycast's Node
  runtime. No telemetry, no analytics, no remote code, no persistent storage
  beyond Raycast's own preference store and the in-memory/disk cache it manages.

## Trust boundary & threats

| Surface | Threat | Mitigation |
| --- | --- | --- |
| Feed item links | A hostile feed supplies `javascript:` / `file:` / `data:` URLs that get opened or copied | `safeUrl()` parses every link and keeps **only `http(s)`**; non-web links are dropped and their actions hidden (`src/lib/fetch.ts`). |
| Feed title/summary | Markdown/HTML injection in the preview — e.g. a remote-image beacon `![](http://tracker/…)` or crafted links | `mdSafe()` escapes `` [ ] ` < > ! `` before rendering item text in the Detail view and in copied markdown (`src/latest-news.tsx`). |
| XML parsing | XXE / external-entity expansion | `rss-parser` (xml2js) does not process DTDs or external entities. |
| User keyword inputs | Regex injection / ReDoS via watchlist, extra-keyword, denylist fields | All user terms are **regex-escaped** before use; matches are literal + word-boundary, so they run in linear time (`src/lib/score.ts`, `src/lib/watchlist.ts`). |
| KEV title parsing | ReDoS / CPU over a large untrusted body | The enrichment regex scans at most the first 5000 chars (`MAX_KEV_SCAN`). |
| One bad feed | A single failing/malicious feed breaks the whole list | Feeds are fetched with `Promise.allSettled`; per-feed failures are isolated and the rest still render. |

## What this extension does NOT do

- No `eval`, `child_process`, `fs`, or `process.env` access.
- No secrets, API keys, or credentials — none are needed or stored.
- No network access beyond the RSS feeds the user configures.
- No background tasks; it runs only while the command is open.

## A note on configurable feeds

The Feed Sources preference accepts any `http(s)` URL, including internal or
`localhost` addresses. This is intentional — the URLs are supplied by the user
for their own machine; there is no external party who can inject a feed URL, so
this is not a server-side request forgery (SSRF) vector. Non-`http(s)` schemes
are rejected.

## Dependencies

`@raycast/api`, `@raycast/utils`, and `rss-parser`. `npm audit` reports no known
vulnerabilities. Keep dependencies updated and re-run `npm audit` before each
release.

## Reporting a vulnerability

Cyber Security Pulse is maintained by **Metavoli** (https://metavoli.no).

Report security vulnerabilities — or any other concern about this extension —
privately to **admin@metavoli.no**. Please do not open a public issue for
security reports. Metavoli will acknowledge valid reports and address them as
quickly as we can.

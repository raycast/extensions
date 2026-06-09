# 6. Security Hardening Before Store Publish

## Status

Accepted

Related: hardens the data path from [0001](0001-secnews-raycast-plugin.md) and the
title enrichment from [0005](0005-enrich-cisa-kev-titles.md).

## Date

2026-06-03

## Context

Before publishing to the public Raycast Store, the extension was reviewed for
security. It ingests **untrusted** remote RSS content and renders it / opens its
links. `npm audit` reports 0 dependency vulnerabilities; there is no use of
`eval`, `child_process`, `fs`, or `process.env`; and the XML parser (xml2js via
rss-parser) does not process DTDs or external entities, so XXE is not a concern.

Three issues remained:

1. **Unvalidated link scheme (medium).** `item.link` from a feed flowed into
   `Action.OpenInBrowser`, `Detail.Metadata.Link`, and clipboard actions with no
   scheme check. A hostile feed could supply `javascript:`, `file:`, or `data:`
   URLs.
2. **Markdown injection in the preview (low).** `NewsDetail` rendered the feed
   `title`/`summary` as markdown, allowing a remote-image beacon
   (`![](http://tracker/…)`) or crafted links.
3. **Unbounded regex over untrusted body (low).** The KEV enrichment regex ran on
   the full body, a minor ReDoS / CPU surface.

## Decision

In `lib/fetch.ts`:

- Add `safeUrl(raw)`: parse with `URL`; return the string only when the protocol
  is `http:` or `https:`, otherwise `""`. Apply to every item link at parse time,
  so the rest of the app only ever sees safe links (the UI already hides
  link-dependent actions when the link is empty).
- Cap the body passed to the KEV regex (`MAX_KEV_SCAN = 5000` chars).

In `latest-news.tsx`:

- Add `mdSafe(s)` escaping `[ ] \` < > !` and backslash, and apply it to the
  `title` and `summary` rendered inside `NewsDetail`'s markdown, and to the title
  used as link text in the copied markdown. This neutralizes image/link/HTML/code
  injection while keeping text readable.

## Consequences

- **Easier:** feed content can no longer open non-web URL schemes, beacon via
  images, or inject markup; safer to ship publicly.
- **Harder:** items whose link is a non-http(s) scheme lose their open/copy
  actions (acceptable — such links are not legitimate news links).
- **Invariants:** only `http(s)` links reach `open`/clipboard; rendered preview
  text is markdown-neutral. If a future feature renders feed HTML directly, this
  ADR must be revisited.

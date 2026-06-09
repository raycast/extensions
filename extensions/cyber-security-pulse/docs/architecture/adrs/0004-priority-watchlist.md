# 4. Priority Watchlist (Pinned Watched Section)

## Status

Accepted

Related: builds on [0002](0002-severity-recalibration-and-sections.md) (scoring)
and [0003](0003-hybrid-capped-list-nav-and-share.md) (list layout).

## Date

2026-06-02

## Context

The user wants to prioritize news about specific technologies they care about
(vendors, products, packages), surfaced ahead of the severity view. PURL was
suggested; however PURL (`pkg:npm/lodash`) is package identity, while security
headlines use vendor/product prose. So matching is keyword/alias based, and PURL
is supported as a convenient way to *seed* aliases.

## Decision

### Configuration: a Raycast preference field

The command gains one optional `textfield` preference, `watchlist`. Flat text,
edited in Raycast preferences (no code change). Compact syntax:

- Comma separates entries.
- Within an entry, `|` separates the display name from aliases.
- A token beginning `pkg:` is parsed as a PURL; its package name and namespace
  are added as aliases (display name defaults to the package name).

Example: `Fortinet|fortios|fortigate, WordPress|wp, pkg:npm/lodash, OpenSSL`

### Parsing & matching (`lib/watchlist.ts`)

```ts
export interface WatchEntry { name: string; aliases: string[]; }
export function parseWatchlist(raw: string): WatchEntry[];
export function matchWatch(text: string, entries: WatchEntry[]): WatchEntry | undefined;
```

Matching is word-boundary aware (same approach as `score.ts`) against
`title + summary`. PURL parsing strips `pkg:`, version (`@…`), qualifiers (`?…`)
and subpath (`#…`), then takes the last path segment as the package name and the
preceding segment as a namespace alias.

### UI: pinned ⭐ Watched section

`latest-news.tsx` reads the preference, parses it, and computes the watched
subset of the loaded items. When non-empty, a `⭐ Watched` `List.Section` renders
**first** (above the top severity tier), each row showing its severity emoji as
icon plus the usual source/date accessories. Watched items are an additive pin —
they also remain in their severity tiers, so tier counts stay truthful and the
feature is purely additive. Items keep their normal actions (preview, open,
share, nav).

## Consequences

- **Easier:** the user's priority tech is always visible first without touching
  code; PURL holders can paste package identifiers directly.
- **Harder:** prose matching is heuristic (a watch entry can over- or
  under-match); PURL→alias seeding is best-effort. Watched items appear twice on
  screen (pinned + in their tier) by design.
- **Invariants:** watchlist never changes severity classification (ADR-0002) — it
  only pins; an empty/absent preference yields no Watched section and the
  ADR-0003 layout is unchanged.

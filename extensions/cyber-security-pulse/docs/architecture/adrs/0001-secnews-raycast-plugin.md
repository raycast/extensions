# 1. Cyber Security News Raycast Plugin

## Status

Accepted

Related: none (first ADR in this repo).

## Date

2026-06-02

## Context

The user wants a Raycast extension that surfaces the latest important cyber
security news at a glance. Requirements gathered during brainstorming:

- **Sources:** curated RSS feeds (no API keys, free, full control over quality).
- **Importance:** keyword/severity ranking — items are scored and sorted, not
  just shown newest-first.
- **Interaction:** the list item leads to a short in-Raycast preview; a further
  action opens the full article in the browser.

This is a greenfield repo (`jj` + `bd` just initialized, no prior code). The
decision establishes the extension structure, the source list, the scoring
model, and the interaction flow.

## Decision

Build a standard Raycast extension in TypeScript + React using the official
scaffold. No backend, no API keys, no local database.

### Dependencies

- `@raycast/api` — extension framework (List, Detail, Action).
- `@raycast/utils` — `useCachedPromise` for fetch + cache + stale-while-revalidate.
- `rss-parser` — RSS/Atom parsing.

### Module layout

```
src/
  latest-news.tsx       # command: List view + state
  lib/feeds.ts          # FEEDS[] curated source list
  lib/fetch.ts          # fetchAllFeeds(): parallel fetch+parse, merge, dedup
  lib/score.ts          # scoreItem(): keyword/severity scoring + tag
  lib/types.ts          # NewsItem type
```

### Public contracts

```ts
// lib/types.ts
export type Severity = "critical" | "high" | "normal";
export interface NewsItem {
  title: string;
  link: string;
  source: string;        // feed display name
  publishedAt: number;   // epoch ms; 0 if missing
  summary: string;       // plain-text snippet, may be ""
  score: number;
  severity: Severity;
}

// lib/feeds.ts
export interface Feed { name: string; url: string; }
export const FEEDS: Feed[];

// lib/fetch.ts
export function fetchAllFeeds(): Promise<NewsItem[]>;  // sorted score desc, date desc

// lib/score.ts
export function scoreItem(title: string, body: string): { score: number; severity: Severity };
```

### Command

Single `view`-mode command `Latest Security News` (file `latest-news.tsx`).

### Data flow

1. `useCachedPromise(fetchAllFeeds)` drives the List.
2. `fetchAllFeeds` fetches every feed with `Promise.allSettled` (per-feed
   failure isolated), parses each via `rss-parser`, flattens.
3. Dedup by `link`.
4. `scoreItem(title, summary)` per item → attach `score` + `severity`.
5. Sort by `score desc`, then `publishedAt desc`.

### Scoring model (`score.ts`)

Keyword tiers (title matches weighted 2×, body 1×):

- **Critical (+10):** `zero-day`, `0-day`, `actively exploited`, `RCE`,
  `unauthenticated`, `wormable`.
- **High (+5):** `ransomware`, `CVSS 9`, `CVSS 10`, `critical`, `backdoor`,
  `supply chain`.
- **Medium (+2):** `patch`, `vulnerability`, `breach`, `CVE-`.

Severity tag from total score: `≥10` → 🔴 critical, `≥5` → 🟠 high, else ⚪ normal.
Keywords/tiers/thresholds live in `score.ts` as editable constants — no
preferences UI initially (YAGNI).

### Default feeds (`feeds.ts`)

BleepingComputer, The Hacker News, Krebs on Security, CISA Alerts, Schneier on
Security, SANS Internet Storm Center. Editable by hand.

### Interaction / actions

- List item Enter → push a `Detail` view: title, source, severity, relative
  date, summary snippet, link.
- In Detail: `Open in Browser` (primary), `Copy Link`.
- List item accessories: source name, severity emoji, relative date.
- `Cmd+R` reloads (re-fetch).

### Error handling

- Per-feed failure skipped (`allSettled`); remaining feeds still render.
- If ALL feeds fail → failure toast, empty list.
- Item with no content → title-only.

### Rejected alternatives

- **Aggregator API (Feedly/NewsAPI):** needs key, possible cost, less control.
- **CISA/NVD official only:** too narrow (vuln-only, not general news).
- **Background daemon + local DB:** overkill; `useCachedPromise` suffices.
- **Server-side aggregator:** needs hosting, defeats a self-contained plugin.

## Consequences

- **Easier:** zero-config install (no keys); source list and scoring are plain
  editable code; standard Raycast patterns keep it maintainable.
- **Harder:** RSS feed formats vary — parsing must be defensive. Keyword scoring
  is heuristic, not semantic; tuning is manual.
- **Follow-up:** tracked under the beads epic created from this ADR.
- **Failure modes:** dead/changed feed URLs, rate limiting, malformed XML,
  duplicate stories across sources (mitigated by link dedup, not title dedup).
- **Invariants:** no API keys required; per-feed failure never breaks the whole
  list; scoring config stays in code. If any breaks, revisit this ADR.
```


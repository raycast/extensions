# 9. Denylist (Hide Unwanted News)

## Status

Accepted

Related: complements the watchlist [0004](0004-priority-watchlist.md) and the
extra-keyword config [0008](0008-configurable-extra-severity-keywords.md).

## Date

2026-06-03

## Context

Users want to suppress topics they don't care about (e.g. "Android"). A simple
keyword denylist covers this without a complex rules UI.

## Decision

Add one optional `denylist` `textfield` preference: comma-separated keywords.
Any item whose **title or summary** matches a deny keyword (word-boundary,
case-insensitive — the same matcher used elsewhere) is **hidden from the entire
view**: the severity tiers, the ⭐ Watched section, and the copied markdown.

Filtering happens at **render time** in `latest-news.tsx`, not in the cached
fetch, so changing the denylist re-filters instantly without refetching. The
match helper is exported from `lib/score.ts` (`hasKeyword`) to reuse the existing
boundary-aware regex logic.

```ts
const deny = parseKeywords(denylist ?? "");
const items = deny.length
  ? data.filter((i) => !hasKeyword(`${i.title} ${i.summary}`, deny))
  : data;
```

## Consequences

- **Easier:** users mute noise with a single field; no refetch on change.
- **Harder:** a broad deny term can hide more than intended (matches in the
  summary too) — user's choice.
- **Invariants:** denylist only *removes* items from display; it never changes
  severity or fetching. Empty preference is a no-op.

# 11. Sort Toggle: Date vs Criticality

## Status

Accepted

Related: refines the intra-tier ordering from
[0010](0010-promo-demotion-and-date-sort.md).

## Date

2026-06-09

## Context

ADR-0010 fixed intra-tier ordering to newest-first. But a single tier (e.g.
Critical) holds items of differing strength, and users want to read either
chronologically or by how critical each item is. They asked to **switch** the
ordering per view, not have it fixed.

## Decision

Add a persisted **sort dropdown** to the list's search bar
(`List.Dropdown` as `searchBarAccessory`, `storeValue` so the choice sticks):

- **Newest first** (default) — `publishedAt` descending.
- **By criticality** — `score` descending (the severity base plus matched-signal
  bonus), then `publishedAt` as a tiebreak.

Tiers remain ordered by severity (critical → low); the toggle only changes order
**within** each tier. Sorting moves to render time in `latest-news.tsx` (keyed on
the dropdown state) and is applied to the inline tiers and the ⭐ Watched section.
The same dropdown also appears in the drilled-in `TierList` so the order can be
changed from inside a category; it seeds from the caller's current choice and,
via a shared dropdown `id` + `storeValue`, the selection persists and stays
consistent across both views. The feed-level sort in `fetch.ts` is now just a
stable default; the UI is authoritative.

## Consequences

- **Easier:** users read each category the way they want; choice persists across
  opens.
- **Harder:** "criticality" within a tier is the heuristic match-count score, not
  a precise ranking — good enough for ordering.
- **Invariants:** tier order is always by severity; the toggle only reorders
  within a tier; default is newest-first.

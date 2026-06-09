# 3. Hybrid Capped-Section List, Navigation, and Sharing

## Status

Accepted

Related: revises the UI decision in [0002](0002-severity-recalibration-and-sections.md).

## Date

2026-06-02

## Context

The pure two-level drill-down (ADR-0002) hid the most relevant items behind a
keypress. The user wants a hybrid: a categorized list where the highest-priority
items are immediately visible and scrollable, drilling only for overflow. Plus
explicit navigation semantics and the ability to share the list.

## Decision

### Hybrid capped sections

`latest-news.tsx` shows only the **highest non-empty tier** expanded inline: a
`List.Section` with its top `TOP_N = 5` items, plus a `Show all N` drill row when
it has more. All remaining non-empty tiers appear under a `More` section as
single drill rows (`🟠 High  47 →`) that push their full `TierList`. Order is
fixed critical → high → medium → low and empty tiers are hidden, so the expanded
tier is always the most severe one with content (critical empty → high expands,
etc.) with no special-casing.

### Navigation

- **Forward:** Enter on a news item → `NewsDetail` preview; Enter on the preview
  → `Open in Browser` (primary action).
- **Back:** Esc pops one level (native).
- **⌘→ / ⌘←** are bound as arrow-key synonyms: ⌘→ = go forward (preview, then
  open browser), ⌘← = pop one level (via `useNavigation().pop`, only shown where
  there is something to pop). Bare → / ← cannot be bound (Raycast reserves them
  for list scrolling).

### Sharing

A `Copy List as Markdown` action (⌘⇧C) is available on item and overflow rows
and in `TierList`. It serializes the full ranked set grouped by severity:

```
# Security News — <timestamp>
## 🔴 Critical
- [Title](link) — Source
...
```

Clipboard markdown is the share mechanism (Raycast exposes no generic share
sheet); the user pastes it wherever needed.

## Consequences

- **Easier:** most relevant items are visible with zero drilling; categories
  still scannable; list is portable via clipboard.
- **Harder:** `TOP_N` is a fixed cap (overflow needs a drill); arrow-key forward
  nav is not achievable on Raycast.
- **Invariants:** highest non-empty tier renders first; empty tiers hidden; red
  gating from ADR-0002 unchanged. If a future Raycast API allows bare-arrow
  binding or a share sheet, revisit.

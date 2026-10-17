# 0001 — How the Watchlist Extension Fits Together

**Date:** 2026-08-28
**Lesson:** [0001-how-your-watchlist-extension-works.html](../lessons/0001-how-your-watchlist-extension-works.html)

## Key insight
The extension is deliberately layered: `media-data.ts` owns all file I/O and exports a clean API; UI components call that API and never touch the file directly. This separation means the data format can change without touching any React code.

## Non-obvious things worth remembering

- **The `descs` loop guard**: including `descs` as a `useEffect` dependency normally risks an infinite loop, but the `if (all.length === 0) return` guard breaks the cycle once every IMDb item has been fetched.
- **The `seq` ref pattern**: a monotonically-incrementing ref is the idiomatic way to discard stale async results in React without importing a library.
- **"Read whole file → splice → write whole file"**: safe here because Raycast commands run one at a time. Would not be safe in a concurrent server context.
- **No header auto-creation**: `insertRow()` detects whether the Markdown table header already exists and creates it only when the section is empty. This prevents duplicate headers.

## Zone of proximal development after this lesson
User understands the full architecture. Next natural step (if there were one) would be adding a new command or a new metadata field — both require changes only to `media-data.ts` + the relevant form component.

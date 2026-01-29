---
name: raycast-focus-extension
description: Implements or debugs the Raycast Focus Extra extension: command entry points, List/Detail/Grid for focus sessions, useCachedPromise/usePromise, ActionPanel for Add to Calendar. Use when working on this extension, focus sessions UI, or Raycast extension code in this repo.
---

# Raycast Focus Extension

## Entry points

- Commands live in `package.json` under `commands[]`; each `name` maps to a file under `src/` (e.g. `focus-sessions` → `src/focus-sessions.ts` or `src/focus-sessions.tsx`).
- Switch to `mode: "view"` when adding List/Detail UI.

## UI

- Use **List** for session list (sections, accessories, detail pane); **Detail** for single-session markdown/metadata; **Grid** if tile layout fits.
- Async data: `useCachedPromise` or `usePromise` from `@raycast/utils`. ActionPanel + Action for “Add to Apple Calendar” and other actions.

## Data source

- Focus session storage is not documented. Discover location/schema (e.g. `~/Library/Application Support/Raycast/`, SQLite via `executeSQL`, or plist/JSON) during implementation.

## Reference

- API: https://developers.raycast.com/llms.txt
- Key snippets: [reference.md](reference.md)

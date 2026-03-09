# Multi-URL

Save recurring links as URL sets and open them together in your preferred browser without cluttering your bookmarks bar.

Multi-URL moves repeatable browsing workflows out of your bookmarks/favorites bar into reusable URL sets. You keep a cleaner browser interface while staying browser-agnostic by default. When needed, you can still choose a specific browser per URL set.

## Commands

- `Multi-URL`
  - Main dashboard/root command for Saved Sets management and recent runs.
- `New Set from Clipboard`
  - Creates a saved set from current clipboard text (URLs are auto-extracted and normalized).
- `QuickURL #1` to `QuickURL #5`
  - No-view commands for global hotkeys, each mapped to one saved URL set.

## Key Features

- Save URL sets and open all links in one action.
- Build sets instantly from clipboard text.
- Suggest a page title automatically for single-link clipboard imports.
- Keep system default browser as the default behavior.
- Override browser per set (`Google Chrome`, `Arc`, `Safari`, `Firefox`, custom app name).
- Pin important sets and assign them to QuickURL slots.
- Keep each saved set mapped to only one QuickURL slot at a time.
- Safe guards:
  - URL cap per run (`80`) to avoid accidental tab floods.
  - Slot execution lock (`15s`) to prevent repeated hotkey loops.

## Why Not Just Bookmarks?

- Reduce clutter in your bookmarks/favorites bar.
- Launch full link routines in one action instead of opening links one by one.
- Keep workflows portable across browsers and machines by using system default browser as baseline.

## Typical Flow

1. Open `Multi-URL`.
2. Create a new set from pasted links.
3. Keep browser as `System Default` or choose a specific browser.
4. Save and optionally open immediately.
5. Assign frequently used sets to `QuickURL #1..#5` and bind hotkeys in Raycast.

## Validation Behavior

- Empty or invalid-only inputs cannot be saved.
- Plain non-URL text is ignored.
- Numbered and bulleted pasted lists are supported.

## Screenshots

Planned screenshot order and captions live in `media/SHOTLIST.md`.

## Local Development

```bash
npm --workspace multi-url run dev
npm --workspace multi-url run lint
npm --workspace multi-url run build
```

# Large Clipboard History

Raycast extension that stores clipboard text larger than Raycast's built-in clipboard history can hold.

## Why

Raycast's built-in clipboard history caps each entry at **32,768 characters** ([manual](https://manual.raycast.com/clipboard-history), [issue #16573](https://github.com/raycast/extensions/issues/16573)). Anything larger — long log dumps, full files, multi-page prompts — never makes it in. This extension picks up that slack: a parallel history dedicated to clips above the cap, with search and paste-back.

## Commands

| Command | Mode | What it does |
| --- | --- | --- |
| **Watch Clipboard** | background, every 10s | Saves the current clipboard if it exceeds 32,768 characters. |
| **Large Clipboard History** | view | Browse, search by content substring, copy/paste back, view full content, or delete. Also captures the current clipboard on open if it's above the threshold, so a freshly copied clip is in the list instantly without waiting for the next watcher tick. |

## How capture works

Two independent paths feed the history. They share a SHA-256 dedupe key, so the same clip never gets saved twice no matter which path fires.

1. **Watcher** — fires every 10s in the background. Catches anything you copy and forget about.
2. **Large Clipboard History on open** — reads the current clipboard before showing the list, then renders. The just-copied clip is the top row before you've typed anything.

Both paths are gated on the same 32,768-char threshold and ignore non-text clipboards (images, files copied from Finder without a text representation, etc.) — see "Scope" below.

### Recommended setup: bind a hotkey

Open Raycast preferences (`⌘,`) → Extensions → Large Clipboard History, and assign a hotkey to the **Large Clipboard History** command. With it bound, you can hit one keystroke right after copying a large text and the clip is captured + the list is open in front of you.

## Scope

This extension stores **plain text only**. It uses Raycast's `Clipboard.readText()`, which returns `undefined` for image-only or file-only clipboards, so non-text content is silently skipped. Mixed clipboards (e.g., rich text from a webpage) are stored as their plain-text representation.

## Storage

Clips are stored in a local SQLite database under Raycast's per-extension support directory (`environment.supportPath`). Dedupe is by SHA-256 of content, so re-copying the same large text doesn't create duplicates.

## Preferences

| Preference | Default | Notes |
| --- | --- | --- |
| Max Entries | `500` | Older clips are evicted once the history exceeds this count. |

The 32,768-char watcher threshold is intentionally not configurable — it tracks Raycast's built-in cap so this extension stays purpose-built for what Raycast can't store.

## Requirements

- macOS
- Node.js `>= 22.22.2`
- npm (Raycast's CI requires it; `package-lock.json` is committed)
- Raycast app

## Development

```bash
npm install
npm run dev
```

Other scripts:

| Script | Purpose |
| --- | --- |
| `npm run build` | Validate the extension build (same checks the Store CI runs). |
| `npm run lint` | Lint with `@raycast/eslint-config`. |
| `npm run fix-lint` | Auto-fix lint issues. |
| `npm run publish` | Open a PR to the Raycast Store. |

## Project layout

```
large-clipboard-history/
├── src/
│   ├── watch-clipboard.ts      # background watcher (no-view, 10s)
│   ├── search-vault.tsx        # browse + search + capture-on-open (view)
│   └── lib/
│       ├── sqlite.ts           # node:sqlite open/close lifecycle
│       ├── db.ts               # schema, typed row helpers, query API
│       ├── capture.ts          # shared captureFromClipboard + saveClip + evict
│       └── preferences.ts      # typed preference access
├── package.json
└── tsconfig.json
```

## License

MIT

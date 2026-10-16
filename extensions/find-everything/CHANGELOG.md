# Changelog

## 2026-10-16 (c)

- Native macOS app `app/Find Everything.app` — SwiftUI/NSPanel floating panel, global `⌥Space` hotkey, shared `fe` engine + shared index. Build via `app/bundle-app.sh`, install via `install.sh`.
- Onboarding: missing tools (`fe`/`fd`/`rg`/`fzf`) are downloaded from GitHub releases into `~/Library/Application Support/FindEverything/bin` — no Homebrew or admin rights.
- Full keyboard control: `⌘K` action panel with type-to-filter and `→`/`←` submenus (Open With…, Switch Scope), `⌘↵` folder, `⌥↵` reveal, `⌘D`/`⌘I` details, `⌘Y` Quick Look, `⌘T` Terminal, `⌘⌫` Trash, `⌘1`–`⌘6` + `⌘⌥←`/`→` scopes, `⌃N`/`⌃P`/`PgUp`/`PgDn`/`Home`/`End` navigation, `⌘W` hide, `⌘Q` quit, `⎋` back (clears query first).
- Mouse parity: hover selects, double-click opens, right-click context menu mirrors the action list, `⋯` footer button opens ⌘K panel.
- User habits: "Recently Opened" when the query field is empty, opened items rank higher; stored in `~/Library/Application Support/FindEverything/opens.json`.
- Detail pane shows text previews for code/text files and image previews; toast confirmations for copy/trash.
- Keys are captured via a local event monitor — arrows and Enter now work while the search field has focus (the text field's editor previously swallowed them). Fixed `⌘K` never firing (wrong keycode 37→40) and swapped `⌘5`/`⌘6` scope keys.
- `FE_REMOTE=1` enables a `/tmp/fe-cmd` test channel for deterministic UI automation; `FE_KEEP_VISIBLE=1` keeps the panel up for screenshots.
- `fe` no longer crashes with EPIPE when piped into `head`.

## 2026-10-16 (d)

- Pins (`⌘P`): pinned files show a pin badge, lead the recents list and rank above other results; stored in `pins.json`.
- Path passthrough: typing or pasting an existing absolute/`~/` path resolves it directly — Enter opens without touching the index.
- Footer shows measured search latency (`80 results · 60ms`).
- More file actions: Duplicate (`<name> copy`), Compress to zip, Copy file contents (`⌘⌥⇧C`), Share via NSSharingServicePicker, Finder Get Info on `⌘I`.
- Result rows are draggable file references into Finder or other apps.

## 2026-10-16 (b)

- Standalone CLI `fe` for macOS and Linux — same engine as the Raycast extension, shared index at `~/.cache/hypersearch`. Commands: interactive picker (`fe`), `fe search`, `fe index`, `fe status`, `fe open`, `fe preview`.
- Engine extracted to `src/engine.ts`; the Raycast command is now a thin UI on top of it.
- Fixed `rg` dir-search printing `shard:/path` filename prefixes (`--no-filename`).
- Fixed bare-name binaries (`open`, `xdg-open`, PATH-resolved `rg`) resolving as missing.
- Bun-compiled binaries for darwin-arm64, darwin-x64, linux-x64, linux-arm64.

## 2026-10-16

- Speed: index split into 8 shards, `rg` scans them in parallel — typical query ~30ms (was ~150ms via Node stream). Worst-case queries (e.g. "e") capped at ~30ms instead of ~3s via per-shard `-m` limits.
- `rg` now reads index files directly (mmap/page cache) instead of a Node.js pipe.
- Shards auto-heal: missing dir is re-split from the flat index in ~150ms, no rescan needed.
- Page cache warmed at startup so the first keystroke is not a cold disk read.
- Default index refresh interval 15 → 60 min (less background churn).

## 2026-10-17

- Initial: HyperSearch Raycast extension — persistent `fd` index per scope (`~/.cache/hypersearch/index-<scope>.txt`), `fzf --filter` fuzzy ranking, real Finder file icons, lazy stat for size/mtime, stale-while-revalidate index refresh (`Cmd+R` forces rebuild). No Spotlight dependency.

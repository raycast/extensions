# FSearch for Raycast — spec

## Goals
Raycast front end for Noah Dunnagan's [fsearch](https://github.com/noahdunnagan/fsearch) (whole-disk file search, ~1 ms). Name search and content search with Raycast-native actions.

## Scope
- **Search Files** (`src/search-files.tsx`): name search, kind dropdown, folder scoping (Search in This Folder / Search Everywhere), detail pane with image/text preview (⌘D, cached), Quick Look, file actions.
- **Search File Contents** (`src/search-contents.tsx`): grep via daemon, Text / Regular Expression / Definition modes, one section per file, Open at Line in VS Code / Cursor / Zed / Xcode (command preference).
- Not in scope: bundling the fsearch binary, store publishing.

## Decisions
- **Transport:** JSON lines straight over `~/Library/Application Support/FSearch/fsearch.sock` (`src/lib/fsearch.ts`), one connection per request, abortable. No process spawn per keystroke. If the socket is missing, run `<binary> status` once, which starts the daemon (setsid), then retry.
- **Indexing:** daemon answers `indexing…` during the first crawl; `use-fsearch.ts` retries every 1 s and shows "Indexing Your Mac".
- **Applications filter uses `ext:app`, not `type:app`:** fsearch's `type:app` requires KIND_DIR, but macOS 26+ system apps in /Applications (Safari) are symlinks into the Cryptex, so they drop out. Upstream bug, worth reporting to Noah.
- **Content query split** (`content-query.ts`): tokens like `ext:`/`in:`/`type:` go to `q`, the rest is the pattern.
- Product name in UI copy is "FSearch" (Noah's README title); the command is `fsearch`.
- Icon: SF Symbol magnifyingglass on a flat dark squircle (`assets/icon.png`).

## Current state (2026-10-08)
- `ray build` and `tsc` clean; `ray lint` clean except the author handle (`paused` 404s on Raycast).
- Client library checked in a Node harness against the live daemon: fuzzy search, `ext:app`, literal + symbol grep, query error, abort, missing-binary path.
- **Not yet seen on screen** in Raycast. Visual check is paused's (deeplinks into Raycast steal focus).

## Open questions
- Daemon spawned from Raycast inherits Raycast's TCC; without Full Disk Access it skips protected folders. Fine when the daemon is already running from a terminal or the login agent.
- Publish to the store? Needs a real Raycast author handle; maybe ship under Noah.

## Acceptance criteria
- Typing finds files in < 50 ms end to end; typos tolerated.
- Every failure state has an empty view: not installed, indexing, bad query, unreachable.
- Content matches open at the right line in the chosen editor.

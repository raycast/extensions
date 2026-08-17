# Ten Four Changelog

## [Optional remote shelf] - {PR_MERGE_DATE}

- New optional **Shelf URL** preference. Leave it blank and nothing changes: the shelf stays a local file, `~/.ten-four.json`, on your Mac.
- Set it to a Ten Four shelf service endpoint and the extension reads that instead, so snippets pushed from another machine (a dev box, a container, Claude Code on a server) land on your Mac. Copy, paste, pin, remove and clear all work the same in either mode.
- The bundled `tenfour` CLI follows the same rule: it pushes to `TENFOUR_URL` when that is set, and writes the local file when it is not.
- The CLI gained `--source` / `-s` for optional provenance on a snippet.
- The empty state now names the backend it is reading, so a blank or mistyped Shelf URL is obvious at a glance.

## [Initial Release] - 2026-08-10

- Ten Four Shelf command: searchable list of snippets with copy, paste, pin, remove, and clear actions, plus a live-updating detail view.
- Install Ten Four CLI command: installs the bundled `tenfour` CLI into your PATH so your terminal and Claude Code can push snippets onto the shelf.
- Snippets are stored in `~/.ten-four.json` (override with `TENFOUR_FILE`).

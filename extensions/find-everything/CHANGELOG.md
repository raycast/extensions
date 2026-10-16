# Changelog

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

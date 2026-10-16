# Changelog

## 2026-10-16

- Speed: index split into 8 shards, `rg` scans them in parallel — typical query ~30ms (was ~150ms via Node stream). Worst-case queries (e.g. "e") capped at ~30ms instead of ~3s via per-shard `-m` limits.
- `rg` now reads index files directly (mmap/page cache) instead of a Node.js pipe.
- Shards auto-heal: missing dir is re-split from the flat index in ~150ms, no rescan needed.
- Page cache warmed at startup so the first keystroke is not a cold disk read.
- Default index refresh interval 15 → 60 min (less background churn).

## 2026-10-17

- Initial: HyperSearch Raycast extension — persistent `fd` index per scope (`~/.cache/hypersearch/index-<scope>.txt`), `fzf --filter` fuzzy ranking, real Finder file icons, lazy stat for size/mtime, stale-while-revalidate index refresh (`Cmd+R` forces rebuild). No Spotlight dependency.

# Mint for Raycast

Inspect Mint’s on-device storage intelligence without leaving Raycast.

## Commands

- **View Mint Status** — disk usage, reclaimable space, seven-day activity, and managed folders.
- **Scan Reclaimable Space** — a read-only scan of developer caches, app caches, logs, and junk.
- **Explain Disk Growth or File Activity** — explain storage changes or investigate Mint operations involving a path.

The extension intentionally does not expose destructive actions. Cleanup remains in Mint’s review-first workflow, where actions default to Trash and enter the 90-day operation journal.

All command output stays on this Mac. The extension does not send paths, filenames, scan results, or activity history to Raycast or DZG Studio.

## Requirements

Install the direct edition of Mint from https://mint.dzgapp.com and launch it once from Finder. The extension locates `mint-cli` in Homebrew’s standard binary paths or inside `/Applications/Mint.app`.

Mint requires macOS 14 Sonoma or later.

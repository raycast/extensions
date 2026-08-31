# Mint for Raycast

Inspect Mint’s on-device storage intelligence without leaving Raycast.

## Commands

- **View Mint Status** — disk usage, reclaimable space, seven-day activity, and managed folders.
- **Scan Reclaimable Space** — a focused, read-only scan of developer caches, app caches, logs, and junk. Mint's full Disk review engine remains in the app.
- **Explain Disk Growth or File Activity** — explain storage changes or investigate Mint operations involving a path.

## How Mint Differs From Disk Analyzers

Mint is a companion for the Mint app, not a general-purpose disk browser. It reads Mint's signed local CLI to show storage trends, Mint-managed folders, recent Mint activity, and focused reclaimable categories. It does not crawl arbitrary folders from Raycast, request Full Disk Access for Raycast, or expose deletion; cleanup remains in Mint's review-first workflow.

The extension intentionally does not expose destructive actions. Cleanup remains in Mint’s review-first workflow, where actions default to Trash and enter the 90-day operation journal.

All command output stays on this Mac. The extension does not send paths, filenames, scan results, or activity history to Raycast or DZG Studio.

Before running a command, the extension verifies that Mint's CLI is signed by DZG Studio LLC and checks its machine-readable schema and read-only capabilities. An unsigned, altered, or incompatible CLI is never executed.

## Requirements

Install the direct edition of Mint from https://mint.dzgapp.com and launch it once from Finder. The extension locates `mint-cli` in Homebrew’s standard binary paths or inside `/Applications/Mint.app`.

Mint requires macOS 14 Sonoma or later.

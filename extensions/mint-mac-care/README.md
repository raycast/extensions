# Mint for Raycast

Use Mint's native Mac-care tools as a fast Raycast interface. Raycast handles selection and review; the signed Mint app performs every scan and action with the same engines, plan allowance, Boundaries, history, and Undo used by Mint's window and menu bar.

## Commands

- **Review AI Agent Storage** — see what Codex, Claude Code, Claude Desktop, Cursor, and other AI tools keep on this Mac, including conversation age and reclaimable archived media.
- **Free Disk** — run a standard scan or add exact duplicates, similar photos, and reversible AI archive optimization; review every result before cleaning.
- **Free Memory** — release ordinary apps quickly, with a separate explicit step for advanced processes.
- **Uninstall App** — find an installed app and its leftovers, review protected or administrator-required items, then move the selection to Trash.
- **Quick Redact** — detect sensitive content locally and export a new redacted PDF or image from Raycast.
- **Full Redact in Mint** — open the selected file in Mint's visual editor for manual redaction and page-by-page review.
- **Undo Mint Action** — restore recoverable cleanup, uninstall, organization, and AI archive optimization actions.
- **View Mint Status** — see disk usage, reclaimable space, seven-day activity, and managed folders.
- **Explain Disk Growth or File Activity** — explain storage changes or investigate Mint operations involving a path.

## One Product, Another Interface

This extension is not a separate cleaner and does not have a separate subscription. It requires the direct edition of Mint and uses the plan already active in Mint. Actions started in Raycast appear in Mint's normal history and count against the same cleanup allowance.

The extension never implements deletion itself. It sends a short-lived, local request to Mint's signed command surface; Mint then revalidates live files or processes before acting. Protected Boundaries stay protected, Needs Review items require an explicit selection, cleanup defaults to Trash where supported, and existing redaction outputs are never overwritten.

Paths, filenames, scan results, and redaction detections stay on this Mac. Sensitive matched text is not returned to Raycast.

## Requirements

Install Mint 1.0.25 or later from https://mint.dzgapp.com and launch it once from Finder. The extension verifies DZG Studio's signature and the `surface.v1` capability before exposing native actions.

Mint requires macOS 14 Sonoma or later.

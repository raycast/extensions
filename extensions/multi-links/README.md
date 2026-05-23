# Open Multiple Links

Bulk-open every URL hiding in a chunk of text — Slack threads, release notes, notes docs, share-sheet dumps — without clicking each one. Handles web URLs, local file paths, custom URI schemes (`obsidian://`, `vscode://`), `mailto:`, markdown links, and bare domains.

![Hero](media/multi-links-hero.png)

## Commands

### Open Multiple Links
Extracts every URL from the currently-selected text and opens them in your default browser (or a browser of your choice, set in preferences).

### Open Multiple Links from Clipboard
Same as above, but reads from your clipboard instead of selected text — useful when text isn't selectable (PDF, image OCR, etc.).

### Open Multiple Links History
Browse the last 100 batches you've opened. Each entry shows the source, count, type breakdown, and timestamp. Replay, copy as a list, pin to protect from FIFO eviction, or delete.

### Filter Multiple Links
Paste URL-rich text into your clipboard, then run this command to see extracted links grouped by host (web) and type (local files, mailto:, custom schemes). Multi-select with Tab, then Open Selected — useful for previewing before opening, or opening only the GitHub links from a long thread.

## Safety

When a batch hits the confirm threshold (default 10), a dialog shows the count, type breakdown, and first 5 items. Open All or Cancel.

## Preferences

- **Browser** — App to open web URLs in (defaults to system default). Non-web URIs always use the macOS default handler.
- **Open Delay (ms)** — Milliseconds between opens. `0` = parallel (chunked at 10). Higher values help cold-start apps like Obsidian accept URIs.
- **Open all URI types** — When off, only http(s) and `www.` URLs open. Other extracted types are silently skipped.
- **Show confirmation when opening many links** — Toggle for the safety dialog.
- **Confirm Threshold** — Show confirmation when count ≥ this number.

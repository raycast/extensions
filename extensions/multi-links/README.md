# Open Multiple Links

Bulk-open every URL hiding in a chunk of text — Slack threads, release notes, notes docs, share-sheet dumps — without clicking each one. Handles web URLs, local file paths, custom URI schemes (`obsidian://`, `vscode://`), `mailto:`, markdown links, and bare domains.

## Commands

### Open Multiple Links
Extracts every URL from the currently-selected text and opens them in your default browser (or a browser of your choice, set in preferences).

### Open Multiple Links from Clipboard
Same as above, but reads from your clipboard instead of selected text — useful when text isn't selectable (PDF, image OCR, etc.).

### Open Multiple Links History
Browse the last 100 batches you've opened. Each entry shows the source, count, type breakdown, and timestamp. Replay, copy as a list, pin to protect from FIFO eviction, or delete.

### Filter Multiple Links
Paste URL-rich text into your clipboard, then run this command to see extracted links grouped by host (web) and type (local files, mailto:, custom schemes). Multi-select with ⌘T, then Open Selected — useful for previewing before opening, or opening only the GitHub links from a long thread.

## Safety

When a batch hits the confirm threshold (default 10), a dialog shows the count, type breakdown, and first 5 items. Open All or Cancel.

**Executables always confirm.** If any extracted item is a local file that runs code on open — an app bundle, installer (`.app`, `.dmg`, `.pkg`, `.xip`), or shell/automation script (`.sh`, `.command`, `.scpt`, `.workflow`) — a warning dialog appears *regardless* of the threshold or the confirmation toggle, even for a single item. This guards against untrusted pasted text silently launching something.

## How links are detected

Extraction is intentionally permissive so it catches links that aren't fully-qualified URLs. Two things worth knowing:

- **Non-web types open by default.** Local paths, `mailto:`, and custom schemes (`obsidian://`, `vscode://`, …) are opened alongside web URLs — that's the point of the extension. Turn off **Open all URI types** to restrict opening to `http(s)`/`www.` only.
- **A bare `word.tld` is treated as a website.** Because some file extensions double as top-level domains (`index.app`, `notes.io`, `demo.dev`), a bare token like `index.app` is opened as `https://index.app`. To have such a token treated as a *file* instead, give it a path (`./index.app` or `/full/path/index.app`).

## Preferences

- **Browser** — App to open web URLs in (defaults to system default). Non-web URIs always use the macOS default handler.
- **Open Delay (ms)** — Milliseconds between opens. `0` = parallel (chunked at 10). Higher values help cold-start apps like Obsidian accept URIs.
- **Open all URI types** — When off, only http(s) and `www.` URLs open. Other extracted types are silently skipped.
- **Show confirmation when opening many links** — Toggle for the safety dialog.
- **Confirm Threshold** — Show confirmation when count ≥ this number.

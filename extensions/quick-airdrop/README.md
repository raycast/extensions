# Quick AirDrop

Trigger the macOS AirDrop sheet straight from Raycast.

## Commands

- **AirDrop Selected File** — Send whatever is selected in the frontmost Finder window.
- **AirDrop Clipboard** — Auto-detects what's on the clipboard and AirDrops it:
  - A copied file ➜ sent as a file.
  - An `http(s)` URL ➜ sent as a link.
  - Plain text ➜ saved to a temporary `.txt` and sent.
- **AirDrop Browser Tab** — Sends the URL of the active tab in your browser. Requires the [Raycast Browser Extension](https://raycast.com/browser-extension).
- **AirDrop Selected Text** — Sends the text currently highlighted in the frontmost app. URLs go through as links; anything else is dropped into a temporary `.txt`.
- **Copy Last AirDropped File** — Copies the most recently received AirDrop file to the clipboard.
- **Paste Last AirDropped File** — Pastes the most recently received AirDrop file straight into the frontmost app.
- **Search AirDropped Files** — Browses every file received via AirDrop (newest first) with copy, paste, open, reveal, and trash actions. A single file can be moved to the Trash with `⌃X`; when the latest transfer contained several files, the whole batch can be trashed at once (with confirmation).

If the last transfer contained several files, the copy/paste commands open a picker scoped to that transfer, with `Copy All` / `Paste All` actions.

## How receiving works

macOS saves incoming AirDrop files to `~/Downloads` and stamps them with a `com.apple.quarantine` extended attribute whose agent is `sharingd`, the system's sharing daemon. The received-file commands scan the newest items in Downloads, read that attribute in batched `xattr` calls, and use the timestamp embedded in it — the exact moment of the transfer — to sort. File modification dates are not used because AirDrop preserves the sender's original dates.

Copying puts three representations on the clipboard, so every kind of app can paste what it understands:

- the **file URL** — Finder and most apps paste the real file;
- the **shell-escaped path as plain text** — terminals (and CLI tools like Claude Code) paste the path;
- for a single image, a **downscaled PNG** (long edge capped at 2560 px) — image-only consumers paste the picture itself; the file URL still points at the full-resolution original.

Pasting is terminal-aware: when the frontmost app is a terminal (Terminal, iTerm2, Ghostty, kitty, Alacritty, WezTerm, Warp, Hyper), the paste commands insert the file's path instead of the file itself, since a simulated paste can only deliver text there.

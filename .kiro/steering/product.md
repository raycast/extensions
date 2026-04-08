# Product Overview

Croc Transfer is a Raycast extension that provides a GUI for [croc](https://github.com/schollz/croc), a CLI tool for secure peer-to-peer file transfers.

## Commands

- **Send File** — Select files/folders from Finder or a file picker, generate a code phrase, and wait for a receiver. Directories are auto-zipped before sending.
- **Receive File** — Enter a code phrase (typed, from clipboard, or via deep link) to download files. Supports auto-detection of croc codes from clipboard text.
- **Transfer History** — Browse past transfers with file previews (images, text, QuickLook thumbnails), re-send files, copy phrases/deep links, and manage records.

## Key Behaviors

- Croc binary is auto-detected (Homebrew paths, PATH lookup) or user-configured via preferences.
- If croc is not installed, an install guide is shown instead of the command UI.
- Transfers run as background child processes spawned through a Python PTY wrapper (croc writes to /dev/tty).
- Received files are renamed with a timestamp pattern (`receive-YYYYMMDD-HHmm`) and `.txt` files are converted to `.md`.
- Transfer history is persisted in Raycast LocalStorage (max 100 records).
- Deep links allow one-click receive: `raycast://extensions/wilton/croc-transfer/receive-file?arguments=...`

## User Preferences

- `crocPath` — Custom path to croc binary
- `downloadDirectory` — Where received files are saved (default: `~/Downloads/Share`)
- `autoAccept` — Skip confirmation on incoming transfers
- `customRelay` — Custom relay server address

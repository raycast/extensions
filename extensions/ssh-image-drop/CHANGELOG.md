# SSH Image Drop Changelog

## [Send Clipboard to Clipboard] - {PR_MERGE_DATE}

- New command: **Send Clipboard to Clipboard** — puts your clipboard straight onto a macOS server's clipboard over SSH, so a Screen Sharing session can paste it. Works around Screen Sharing's own clipboard sync dropping text
- Sends highlighted text straight from the frontmost app — no copy step. Falls back to the clipboard when nothing is selected, so apps that don't expose a selection keep working
- Text and images both supported; nothing is left behind on the server. When the clipboard holds both, the text wins — the toast and HUD name what was sent and how big it was
- Non-macOS servers and SSH users without a GUI session are detected before any data is sent, each with its own message instead of a generic connection error

## [Store Listing Update] - 2026-08-13

- Redrawn extension icon — the arrow fills more of the canvas, so it stays legible at store list size
- README now links a donation page

## [Initial Release] - 2026-08-12

- Send files, folders, and clipboard images to servers over SSH — file sends use a one-screen picker form, pre-filled from your Finder selection on macOS
- Pull a remote file (path taken from the clipboard) back into Finder
- Windows support: clipboard push/pull, file/folder sends, and server management (password or SSH key) — passwords are stored DPAPI-encrypted; remote servers must run macOS/Linux
- Optional auto-paste for clipboard images: pick a target app and the remote path is pasted straight into it when it is frontmost as the transfer finishes, instead of only landing on the clipboard
- Clipboard images over 20 MB are rejected before the upload starts, with the actual size in the message
- The server list is built from two files only — `~/.ssh/config` and the extension's own managed config — so every target is one you already have on disk
- Animated progress toast on every transfer, with per-item counts (`Sending 2/5…`) for multi-file sends
- Password stored in the OS credential store (macOS Keychain / Windows DPAPI) by default; optional SSH key auth
- Per-server Quicklinks for instant, target-addressed sends
- Manage Servers command: one place to add, edit, and delete registered servers
- Security hardening: remote path/filename validation (rejects shell metacharacters and `..` segments), atomic symlink-safe `~/.ssh` config writes, isolated 0700 temp directories for clipboard captures, and runtime input re-validation at transfer entry points
- Documented threat model: Keychain ACL trade-off, shared passphrase-less key, and first-connection (TOFU) host-key trust

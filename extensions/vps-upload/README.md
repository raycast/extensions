# VPS Upload

Upload files to your server over SSH and get the **remote path on your clipboard** — built for referencing local files inside a remote SSH session (for example, an AI coding agent running on your VPS, where a dragged-in macOS path doesn't exist on the server).

## Commands

- **Upload Finder Selection** — select file(s) in Finder, trigger the command (give it a hotkey), and they upload immediately with a live progress toast. No window.
- **Upload Files** — pick or drop files into a form, with a progress bar in the panel. Includes first-run onboarding and a **Test Connection** action.

Either way, the remote path is copied to your clipboard the instant the upload starts, so you can paste it straight into your remote session.

## Setup

1. Set the **SSH Host** preference to an `~/.ssh/config` alias (e.g. `vps`) or `user@host`, and a **Remote Directory** (absolute path, created if missing — defaults to `/tmp/raycast-uploads`).
2. Make sure **key-based, non-interactive login works**:
   ```sh
   ssh -o BatchMode=yes <host> true
   ```
   If that prompts for a password or hangs, set up an SSH key first (`ssh-copy-id <host>`).

## How it works

Files are streamed through `ssh <host> "cat > <remote>"`, and progress is measured from the bytes piped locally (stream backpressure keeps the count tracking actual transmission). This needs **no pseudo-tty and no extra tools** — `scp` is intentionally avoided because it only prints a progress meter to a real terminal, which Raycast's runtime can't provide.

Remote filenames are sanitised to `[A-Za-z0-9._-]`, so the pasted path never needs quoting.

## Requirements

- macOS
- An SSH host reachable with key-based, non-interactive login.

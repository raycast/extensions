# Terminal Image Paste

Paste clipboard image as a file path — works in any terminal, SSH session, or TUI app.

## What it does

1. Saves your clipboard image to `/tmp/clip-<timestamp>.png` (unique per invocation)
2. Types that path into your focused window
3. Optionally syncs the file to remote SSH hosts via `scp`

Perfect for dropping screenshots into terminal apps, tmux sessions, or AI tools over SSH that accept file paths but can't receive clipboard images directly.

## Usage

Copy any image (screenshot, browser image, etc.), switch to your terminal, then run **Paste Image as Path** from Raycast.

## Preferences

| Preference           | Description                                                                                                                                          |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Remote SSH Hosts** | Comma-separated SSH hosts to sync the image to (e.g. `myserver`, `user@192.168.1.1`). Uses entries from `~/.ssh/config`. Leave empty for local only. |

## How remote sync works

Remote sync runs in the background via `scp` with a 3-second connection timeout — it never blocks the paste. If the host is unreachable, the paste still completes locally.

## Requirements

- macOS
- SSH configured in `~/.ssh/config` for any remote hosts

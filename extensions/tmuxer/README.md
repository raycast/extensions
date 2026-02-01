# Tmux Sessions

Manage tmux sessions locally or over SSH directly from Raycast.

## Features
- List tmux sessions with window count and attached status
- Attach, create, rename, and kill sessions
- Local or SSH mode
- Open in Ghostty or iTerm2

## Requirements
- `tmux` installed locally (and on the remote host for SSH mode)
- An SSH host alias in `~/.ssh/config` or a reachable `user@host`

## Preferences
- Mode: Local or SSH
- SSH Host: host alias or `user@host` (used when Mode = SSH)
- SSH Args: optional extra SSH flags (e.g., `-i ~/.ssh/hetzner -o IdentitiesOnly=yes`)
- Tmux Socket: optional socket path for `tmux -S`
- Terminal: Ghostty or iTerm2
- Optional: `GHOSTTY_BIN` to override the Ghostty binary path

## Development
- Install: `npm ci`
- Lint: `npm run lint`
- Test: `npm test`
- Run: `npm run dev`

## Publish
- `npm run publish`

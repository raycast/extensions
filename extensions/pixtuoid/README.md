# Pixtuoid for Raycast

Manage [Pixtuoid](https://github.com/IvanWng97/pixtuoid) — the terminal-native,
pixel-art office that visualizes your running AI coding-agent sessions — without
leaving Raycast.

This extension is a thin shell over the `pixtuoid` CLI's `--json` contract; it
does **not** bundle the binary.

## Commands

- **Manage Sources** — lists every agent CLI Pixtuoid knows about (Claude Code,
  Codex, Cursor, Copilot, …) with its connection state, whether the CLI is
  detected on this machine, and any health warning. Press **Enter** to
  connect/disconnect the selected one (disconnect asks to confirm).
- **Start Floating Window** — launches `pixtuoid floating`, the always-on-top
  desktop office.

## Requirements

Install the `pixtuoid` binary with any of:

```sh
cargo install pixtuoid pixtuoid-hook
npm i -g pixtuoid
brew install IvanWng97/pixtuoid/pixtuoid
```

The extension auto-detects it via your login shell's `PATH`, then the common
Homebrew / Cargo / `~/.local/bin` locations. If yours lives elsewhere, set
**Pixtuoid Binary** in the extension preferences to its absolute path.

## How it works

| Command | CLI call |
| --- | --- |
| Manage Sources (list) | `pixtuoid sources --json` |
| Connect / Disconnect | `pixtuoid connect\|disconnect <id> --json` |
| Start Floating Window | `pixtuoid floating` (detached) |

Connecting installs that CLI's hooks; disconnecting removes them. A Pixtuoid
office already running picks up the change on its next launch (the CLI is the
scriptable, persist-only twin of the in-app Sources panel).

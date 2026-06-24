# AI Agent Ports

Monitor and toggle the **caffeinate** state of your running AI coding agents — Codex, Claude, Gemini, and Cursor — straight from the macOS menu bar, so long agent sessions never let your Mac fall asleep mid-task.

This is a Raycast companion for the third-party [`ports`](https://portscli.com) CLI. Under the hood it calls `ports` to detect agent processes, group them by project, and keep them awake (or release / pause / kill them).

## Requirements

- **macOS 12 or later**
- [Raycast](https://www.raycast.com/)
- The **`ports` CLI** (v0.6.0 or newer) — a separate, free, open-source (MIT) tool by [portscli.com](https://portscli.com). **Install it first** (see below); it is _not_ bundled with this extension.

## 1. Install the `ports` CLI

**Homebrew (recommended)**

```sh
brew install erdemylmaz/ports-cli/ports
```

**Other ways**

```sh
# npm — thin wrapper that downloads the prebuilt macOS binary on install
npm install -g @erdemyilmaz/ports-cli

# Go
go install github.com/erdemylmaz/ports-cli/cmd/ports@latest

# Direct download (Apple Silicon; swap -arm64 → -amd64 for Intel)
curl -L -o ports https://github.com/erdemylmaz/ports-cli/releases/latest/download/ports-darwin-arm64
chmod +x ports && mv ports /opt/homebrew/bin/   # or ~/.local/bin, /usr/local/bin
```

Verify it works:

```sh
ports version   # → ports 0.6.0 (or newer)
```

## 2. Install this extension

- **Raycast Store:** search for **"AI Agent Ports"** and click Install.
- **From source:** clone this repo, then:

  ```sh
  npm install
  npm run dev      # opens the commands in Raycast for local development
  ```

## Commands

### AI Agent Status (menu bar)

A live menu-bar readout of how many agent sessions are caffeinated.

- Icon shows ⚡️ (yellow) when at least one session is kept awake, dimmed otherwise; the title shows `caffeinated / total` (e.g. `2/3`).
- Open the menu to see each session (`provider — project`), with one click to caffeinate or release it. Sessions that span several processes expand into a submenu with per-PID toggles.
- Global actions: **Caffeinate All** (`⌘K`), **Release All** (`⌘⇧K`), **Refresh** (`⌘R`).
- Refreshes automatically every minute.

### Manage AI Agents (view)

A full list of running agent sessions, grouped by project, for finer control.

- Filter by provider, project, PID, or parent process.
- Per process / per session: **Caffeinate** / **Release** (`⌘K` / `⌘⇧K`), **Pause** — SIGSTOP (`⌘.`), **Resume** — SIGCONT (`⌘⇧.`), **Kill** — SIGTERM (`⌃X`), **Force Kill** — SIGKILL (`⌃⇧X`).
- Copy a PID, all session PIDs, the project path, or the full command.

## Configuration

Open **Raycast → Extensions → AI Agent Ports**, or pick **Preferences…** from the menu bar.

| Preference             | Default   | What it does                                                                                                                                |
| ---------------------- | --------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| **Ports CLI Path**     | _(auto)_  | Absolute path to the `ports` binary. Leave blank to auto-detect `/opt/homebrew/bin/ports`, `/usr/local/bin/ports`, or `~/.local/bin/ports`. |
| **Roles to Show**      | `agent`   | Comma-separated `role` values from `ports find` to display. `agent` is the main interactive process; use `*` to show every role.            |
| **Extra Search Terms** | _(empty)_ | Comma-separated extra terms passed to `ports find`, on top of the built-in Codex, Claude, Gemini, and Cursor.                               |

## Troubleshooting

- **"Ports CLI not reachable" / "ports CLI error — check Preferences"** — the `ports` binary wasn't found. Confirm `ports version` runs in your terminal, and if it lives somewhere unusual, set its full path in **Ports CLI Path**.
- **"No AI sessions detected"** — `ports` only surfaces agents that are actually running in a real project directory. Start an agent (e.g. `codex`, `claude`, `gemini`, `cursor`) in a project, then **Refresh** (`⌘R`).
- **Mac still sleeps with the lid closed** — this is a macOS limitation: clamshell sleep can override caffeinate unless the Mac is on a supported powered/clamshell setup. Caffeinate reliably keeps the Mac awake with the lid open.

## How it works

The extension shells out to the `ports` CLI: `ports list/find --json` to discover and group sessions, and `ports caffeinate / uncaffeinate / pause / resume / kill / force-kill --pid <pid> --yes` to act on them. No data leaves your machine.

## Credits & license

- The **`ports`** CLI is a separate project by its own author — MIT licensed: [portscli.com](https://portscli.com) · [github.com/erdemylmaz/ports-cli](https://github.com/erdemylmaz/ports-cli). This is a community extension and is not affiliated with portscli.com.
- This Raycast extension is MIT licensed.

# One Usage

Track your AI coding tool usage — [Claude](https://claude.ai), [Codex](https://chatgpt.com), and [Cursor](https://cursor.sh) — all in one place.

## Features

- **View Usage** — See usage details for all enabled providers in a Raycast list, including plan type, rate limit windows, spend tracking, and reset countdowns.
- **Menu Bar Usage** — Keep usage percentages visible in your macOS menu bar at a glance. Shows all providers (e.g. `C:45% X:18% R:62%`) or a single pinned provider (e.g. `45%`), with configurable refresh intervals.
- **Pin to Menu Bar** — From the View Usage command, pin any provider to the menu bar via the action panel (`⌘⇧P`). Use `⌘⇧A` to switch back to showing all providers.

### What Each Provider Shows

| Provider | Metrics |
| -------- | ------- |
| Claude   | Plan type, Session (5h) usage %, Weekly (7d) usage %, Opus usage %, Extra usage (dollar spend) |
| Codex    | Plan type, Session usage %, Weekly usage %, Code Review usage %, Credits balance |
| Cursor   | Plan name, Overall usage %, Included spend ($), On-demand spend ($) |

All progress metrics include a "Resets in X" countdown when available.

## Setup

This extension reads locally stored credentials from each AI tool. **No API keys or manual tokens are needed** — just sign in to each tool normally.

### Claude

Sign in to [Claude Code](https://docs.anthropic.com/en/docs/claude-code) via the CLI (`claude` command). The extension resolves credentials in this order:

1. **macOS Keychain** — reads the `Claude Code-credentials` entry (preferred)
2. **File fallback** — reads `~/.claude/.credentials.json`

### Codex

Sign in to [Codex CLI](https://github.com/openai/codex) (`codex` command). The extension reads your auth token from `~/.codex/auth.json`.

### Cursor

Sign in to [Cursor](https://cursor.sh) (the editor). The extension reads your session token from Cursor's local SQLite database at `~/Library/Application Support/Cursor/User/globalStorage/state.vscdb`. If your token has expired, the extension will automatically refresh it using the stored refresh token.

## Preferences

### Extension Preferences

| Preference    | Description        | Default |
| ------------- | ------------------ | ------- |
| Enable Claude | Show Claude usage  | On      |
| Enable Codex  | Show Codex usage   | On      |
| Enable Cursor | Show Cursor usage  | On      |

### Menu Bar Command Preferences

| Preference       | Description                                          | Default         |
| ---------------- | ---------------------------------------------------- | --------------- |
| Refresh Interval | How often to fetch fresh usage data in the background | Every 5 minutes |

> **Tip:** To choose which provider is shown in the menu bar, use the **Pin to Menu Bar** action in the View Usage command rather than a separate preference.

## Data & Privacy

This extension only reads locally stored credentials to fetch your usage data directly from each provider's API. **No data is collected, stored remotely, or shared.** All communication happens between your machine and the official provider APIs:

- Claude: `api.anthropic.com`
- Codex: `chatgpt.com`
- Cursor: `api2.cursor.sh`

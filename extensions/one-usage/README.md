# One Usage

Track your AI coding tool usage — [Claude](https://claude.ai), [Codex](https://chatgpt.com), and [Cursor](https://cursor.sh) — all in one place.

## Features

- **View Usage** — See usage details for all enabled providers in a Raycast list, including plan type, rate limit windows, spend tracking, and reset times.
- **Menu Bar Usage** — Keep usage percentages visible in your macOS menu bar at a glance. Supports showing a single provider or all providers at once, with configurable refresh intervals.

## Setup

This extension reads locally stored credentials from each AI tool. **No API keys or manual tokens are needed** — just sign in to each tool normally.

### Claude

Sign in to [Claude Code](https://docs.anthropic.com/en/docs/claude-code) via the CLI (`claude` command). The extension reads your OAuth credentials from `~/.claude/.credentials.json`.

### Codex

Sign in to [Codex CLI](https://github.com/openai/codex) (`codex` command). The extension reads your auth token from `~/.codex/auth.json`.

### Cursor

Sign in to [Cursor](https://cursor.sh) (the editor). The extension reads your session token from Cursor's local SQLite database at `~/Library/Application Support/Cursor/User/globalStorage/state.vscdb`. If your token has expired, the extension will attempt to refresh it automatically.

## Preferences

### Extension Preferences

| Preference     | Description                        | Default |
| -------------- | ---------------------------------- | ------- |
| Enable Claude  | Show Claude usage                  | On      |
| Enable Codex   | Show Codex usage                   | On      |
| Enable Cursor  | Show Cursor usage                  | On      |

### Menu Bar Command Preferences

| Preference       | Description                                          | Default        |
| ---------------- | ---------------------------------------------------- | -------------- |
| Show in Menu Bar | Which provider's usage to display in the menu bar    | All Providers  |
| Refresh Interval | How often to fetch fresh usage data in the background | Every 5 minutes |

## Data & Privacy

This extension only reads locally stored credentials to fetch your usage data directly from each provider's API. **No data is collected, stored remotely, or shared.** All communication happens between your machine and the official provider APIs:

- Claude: `api.anthropic.com`
- Codex: `chatgpt.com`
- Cursor: `api2.cursor.sh`

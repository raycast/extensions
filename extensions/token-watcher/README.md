<p align="center">
  <img src="assets/icon.png" width="128" height="128">
</p>

<h1 align="center">Token Watcher</h1>

<p align="center">
Monitor Claude Code and OpenAI Codex token usage and rate limits directly from your menu bar.
</p>

## Screenshots

| Menu Bar | Dashboard |
|---|---|
| ![Menu Bar](metadata/token-watcher-bar.png) | ![Dashboard](metadata/token-watcher-dashboard.png) |

| Details | Details |
|---|---|
| ![Details](metadata/token-watcher-details-1.png) | ![Details](metadata/token-watcher-details-2.png) |

## Features

- **Multi-service support** — Track Claude Code and OpenAI Codex side by side
- **Menu bar integration** — See remaining capacity at a glance without opening Raycast
- **Rate limit tracking** — Session, weekly, and per-model rate limits for Claude; primary and secondary windows for Codex
- **Cost estimation** — Per-session and per-project cost breakdown based on token pricing
- **Project breakdown** — See token usage and cost grouped by project directory
- **Lines of code** — Track lines added and removed across sessions
- **Extra usage & credits** — Monitor Claude extra usage spend and Codex credit balance
- **Configurable** — Enable or disable each service independently

## Commands

### Token Watcher Menu Bar

Persistent menu bar item showing remaining rate limit capacity for all enabled services. Click to expand and see detailed rate limits, cost summaries, and lines of code.

### Token Watcher

Full dashboard view with detailed rate limits, cost breakdowns, and project-level usage. Use the dropdown to switch between Claude and Codex when both are enabled.

### Token Watcher Projects

Per-project usage breakdown showing token counts, cost, and lines of code across time ranges.

## Setup

Token Watcher reads credentials created by each CLI tool. No API keys or manual configuration required.

### Claude Code

1. Install [Claude Code](https://docs.anthropic.com/en/docs/claude-code/overview)
2. Run `claude` in your terminal and complete the authentication flow
3. Credentials are stored at `~/.claude/.credentials.json`

### OpenAI Codex

1. Install [Codex](https://codex.openai.com)
2. Run `codex` in your terminal and complete the authentication flow
3. Credentials are stored at `~/.codex/auth.json`

Once authenticated, Token Watcher automatically detects and starts monitoring available services.

> If neither CLI is set up, the extension shows a setup screen with links to the documentation for each tool.

## Preferences

| Preference | Description | Default |
|---|---|---|
| Enable Claude | Show Claude Code usage and rate limits | On |
| Enable Codex | Show OpenAI Codex usage and rate limits | On |
| Claude Credentials Path | Path to Claude credentials file | `~/.claude/.credentials.json` |
| Codex Credentials Path | Path to Codex auth file | `~/.codex/auth.json` |
| Menu Bar Display | Show remaining capacity or current usage percentage | Remaining % |
| Default Model | Default model tier for cost calculation (Opus or Sonnet) | Opus |

## How It Works

- **Claude Code** — Reads OAuth credentials from disk, calls the Anthropic usage API for rate limits, and parses local JSONL session logs for token counts and cost estimation.
- **OpenAI Codex** — Reads the auth token from disk (refreshing if needed), calls the Codex usage API for rate limits and credit balance.
- **Menu bar** — Refreshes every 5 minutes. Shows `✦` for Claude and `⬢` for Codex with their respective remaining percentages.
- **No data sent** — All session parsing happens locally. The only network calls are to the official Anthropic and OpenAI usage APIs using your existing CLI credentials.

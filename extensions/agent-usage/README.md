# Agent Usage

Track usage across your AI coding agents in one place.

![Agent Usage Screenshot](metadata/agent-usage-1.png)
![Agent Usage Screenshot](metadata/agent-usage-5.png)

## Features

- **Multi-Agent Support** - View usage for Amp Code, Codex (OpenAI), Droid (Factory AI), Gemini CLI, and Kimi
- **Quick Overview** - See remaining quotas and usage at a glance
- **Detailed Breakdown** - Expand each agent for full usage details
- **Refresh & Copy** - Quickly refresh data or copy usage details to clipboard
- **Customizable** - Show/hide agents, reorder list, and configure display preferences

## Supported Agents

| Agent | Data Source | Setup Required |
|-------|-------------|----------------|
| **Amp** | Local SQLite database | None (auto-detected) |
| **Codex** | OpenAI API | None (auto-detected after `codex login`) |
| **Droid** | Factory AI API | Authorization token |
| **Gemini** | Local state file | None (auto-detected) |
| **Kimi** | Moonshot API | Authorization token |

## Configuration

### Codex (Zero Config)

1. Run `codex login` in Terminal (if you are not already logged in)
2. Open Agent Usage in Raycast — Codex usage will be auto-detected from `~/.codex/auth.json`

Optional fallback:
- If auto-detection fails, you can still paste a token manually in extension preferences (`Codex Authorization Token`).

### Droid Token

1. Open https://app.factory.ai/settings/billing in your browser
2. Open DevTools (F12) → Network tab
3. Refresh the page and find any API request
4. Copy the `Authorization` header value
5. Paste in extension preferences
6. Note that the token expiration time is approximately **6 hours**.

## Preferences

- **Visible Agents** - Toggle which agents to show in the list
- **Amp Display Mode** - Show remaining as amount or percentage
- **Agent Order** - Use `⌘⌥↑` / `⌘⌥↓` to reorder agents in the list

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `↵` | Refresh usage data |
| `⌘C` | Copy usage details |
| `⌘⌥↑` | Move agent up |
| `⌘⌥↓` | Move agent down |

## Roadmap

More agents coming soon: Claude Code, and others.

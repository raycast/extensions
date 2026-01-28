# CodexUsage

Track your [OpenAI Codex CLI](https://github.com/openai/codex) usage directly from Raycast. Monitor rate limits, weekly quotas, and credits at a glance.

## Features

- **Real-time usage data** - Fetches live stats from OpenAI's API
- **5-hour session window** - Track your current session usage and reset time
- **Weekly limit tracking** - Monitor weekly quota consumption
- **Credits balance** - See available credits when limits are reached
- **Visual indicators** - Color-coded warnings as you approach limits

## Requirements

- Windows 10/11
- [OpenAI Codex CLI](https://github.com/openai/codex) installed and authenticated
- Raycast for Windows

## Setup

1. Install Codex CLI:
   ```powershell
   npm install -g @openai/codex
   ```

2. Authenticate:
   ```powershell
   codex login
   ```

3. Open Raycast and run **"See Usage"**

The extension automatically detects your Codex authentication from `%USERPROFILE%\.codex\auth.json`.

## Commands

| Command | Description |
|---------|-------------|
| **See Usage** | View current Codex usage, limits, and resets |
| **Manage Providers** | Open extension settings |

## Data Displayed

- **Plan type** (Plus, Pro, etc.)
- **5-hour session usage** with reset countdown
- **Weekly limit usage** with reset countdown  
- **Credits balance** (when available)
- **Rate limit status** warnings

## Roadmap

More AI providers coming soon:
- Claude Code
- Moonshot (Kimi)
- Cursor
- GitHub Copilot

## Credits

Inspired by [CodexBar](https://github.com/steipete/CodexBar) by [Peter Steinberger](https://twitter.com/steipete).

CodexBar is a macOS menu bar app with extensive multi-provider support. CodexUsage brings similar functionality to Raycast on Windows.

## License

MIT

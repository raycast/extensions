# AI Usage Tracker

Track usage statistics across Claude, Codex, and Antigravity AI providers directly from Raycast.

## Features

- **Multi-Provider Support**: Monitor usage across Claude, Codex, and Antigravity in one unified dashboard
- **Real-Time Data**: Fetches live usage data from each provider's API
- **Visual Progress Indicators**: Clear visual representation of usage limits with color-coded gauges and progress bars
- **Session & Weekly Tracking**: View both short-term session limits and longer weekly quotas
- **Quota Pool Grouping**: Antigravity models are grouped by shared quota pools for accurate tracking
- **Code Review Tracking**: Codex includes separate tracking for code review rate limits
- **Plan Information**: See your current subscription tier and account details
- **Caching**: Smart caching to reduce API calls while keeping data fresh

## Setup

This extension reads credentials from the CLI tools for each provider. You'll need to authenticate with each provider's CLI before the extension can fetch usage data.

### Claude

1. Install the Claude CLI: `npm install -g @anthropic-ai/claude-code` (or use the official installer)
2. Run `claude` and complete the authentication flow
3. Your credentials will be stored in the macOS Keychain

The extension reads OAuth tokens from the macOS Keychain under the `Claude Code-credentials` service.

### Codex

1. Install the OpenAI Codex CLI
2. Run `codex` and complete the authentication flow
3. Your credentials will be stored at `~/.codex/auth.json`

### Antigravity

1. Launch the Antigravity application (it must be running for usage tracking to work)
2. The extension automatically discovers the running Antigravity process and communicates with its local API

**Note**: Antigravity must be actively running for the extension to fetch usage data.

## Usage

1. Open Raycast and search for "AI Usage Dashboard"
2. View the list of enabled providers with their current usage percentages
3. Select a provider to see detailed usage information including:
   - Session and weekly usage progress with radial gauges
   - Reset timers showing when limits refresh
   - Pacing indicators (ahead/behind/on-track)
   - Account and plan information (where available)
4. Use `Cmd+R` to refresh the data

## Preferences

You can enable or disable individual providers in the extension preferences:

- **Claude**: Enable Claude usage tracking
- **Codex**: Enable Codex usage tracking  
- **Antigravity**: Enable Antigravity usage tracking

## Troubleshooting

### "No credentials found" errors

- **Claude**: Run `claude` in your terminal to authenticate
- **Codex**: Run `codex` in your terminal to authenticate
- **Antigravity**: Ensure the Antigravity application is running

### "Token expired" errors

For Claude, the extension will attempt to automatically refresh your token. If this fails, re-run `claude` to re-authenticate.

### Antigravity not detected

Ensure the Antigravity desktop application is running. The extension discovers it by looking for the `language_server_macos` process with Antigravity arguments.

## Privacy

This extension:
- Only reads locally-stored credentials (never transmits them elsewhere)
- Communicates directly with each provider's official API
- Does not collect or store any analytics
- Caches usage data locally in Raycast's storage for performance

## License

MIT

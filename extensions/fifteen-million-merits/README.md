# Fifteen Million Merits

Trigger Raycast Focus and block Social Media unless you have work currently running in AI agents. Inspired by a tweet from [@theo](https://x.com/theo/status/2006524110265106510).


## Features

- **AI Agent Session Tracking**: Monitor active sessions from popular AI agents.
- **Dynamic Focus Mode**: Triggers Raycast Focus mode when no AI agents are active.
- **Auto-Completion**: Automatically stops Focus mode once an AI agent session is initiated.
- **Menu Bar Integration**: Real-time counter display and quick controls in the macOS menu bar.
- **Universal Hooks**: One-click setup for Claude Code, Cursor, Opencode, and Codex CLI.

## How it Works

The extension manages a session counter:
- **Count = 0**: Raycast Focus mode starts (blocking distracting categories).
- **Count > 0**: Raycast Focus mode completes (deactivating blocks).

This logic ensures that if you are not actively using an AI agent, your environment remains distraction-free.

## AI Agent Integrations

The `Setup AI Agent Hooks` command configures the following agents:

1. **Claude Code**: Modifies `~/.claude/settings.json` to include `SessionStart` and `SessionEnd` hooks.
2. **Cursor**: Updates `~/.cursor/hooks.json` with `beforeSubmitPrompt` and `stop` hooks.
3. **Opencode**: Creates a plugin in `~/.config/opencode/plugin` to track sessions.
4. **Codex CLI**: Adds aliases to `.zshrc` and `.bashrc`.

## Configuration

Users can configure Focus settings in Raycast Preferences:
- **Focus Goal**: The title shown when Focus starts.
- **Focus Categories**: Comma-separated categories to block (e.g., `social,news`).

## Credits

Inspired by a tweet from [@theo](https://x.com/theo/status/2006524110265106510)

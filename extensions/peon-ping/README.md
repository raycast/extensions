<p align="center">
    <img src="./assets/icon.png" width="150" height="150" />
</p>

# Peon Ping

Manage peon-ping from Raycast with a main command for status, global on/off, and supported settings, plus an optional menu bar quick toggle.

## Commands

**Peon Ping** is the main Raycast command. It includes the global on/off control and all supported settings (volume, packs, categories, notifications, and related preferences).

**Peon Ping Menu Bar** shows status in the menu bar and offers a quick on/off toggle only -- it does not duplicate the full settings UI.

**Toggle Peon Ping** is a no-view command that turns peon-ping on or off in one keystroke from Raycast search.

## Setup

This extension requires [peon-ping](https://github.com/PeonPing/peon-ping) to be installed as a Claude Code hook. The extension expects the script at:

```
~/.claude/hooks/peon-ping/peon.sh
```

## Configuration

| Preference | Description | Default |
|---|---|---|
| Claude config directory | Override the Claude config directory path | `~/.claude` |

The config directory is resolved from: Raycast preference > `CLAUDE_CONFIG_DIR` env var > `~/.claude`.

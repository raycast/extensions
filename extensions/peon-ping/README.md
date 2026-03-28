<p align="center">
    <img src="./assets/icon.png" width="150" height="150" />
</p>

# Peon Ping

Toggle peon-ping sound notifications on or off system-wide from Raycast, with an optional menu bar status indicator.

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

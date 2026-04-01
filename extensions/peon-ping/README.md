<p align="center">
    <img src="./assets/icon.png" width="150" height="150" />
</p>

# Peon Ping

Manage peon-ping from Raycast with a main command for status, global on/off, pack rotation and path rules, notifications, trainer/debug toggles, and other supported settings, plus an optional menu bar quick toggle.

## Commands

**Peon Ping** is the main Raycast command. It includes the global on/off control and all supported settings (volume, packs, categories, notifications, and related preferences).

**Peon Ping Menu Bar** shows status in the menu bar and offers a quick on/off toggle only -- it does not duplicate the full settings UI.

**Toggle Peon Ping** is a no-view command that turns peon-ping on or off in one keystroke from Raycast search.

## Setup

This extension requires [peon-ping](https://github.com/PeonPing/peon-ping) to be installed. It now prefers the `peon` CLI when it is available on `PATH` or in common Homebrew/Linuxbrew install locations, and falls back to the hook script when the CLI is not available.

The fallback script location is:

```
~/.claude/hooks/peon-ping/peon.sh
```

## Configuration

| Preference | Description | Default |
|---|---|---|
| Claude config directory | Override the Claude config directory path | `~/.claude` |

The Claude config directory is resolved from: Raycast preference > `CLAUDE_CONFIG_DIR` env var > `~/.claude`.

The peon install and data paths follow the current peon-ping rules:

- prefer `CLAUDE_PEON_DIR` when it points at an install with packs
- otherwise use the Claude hook directory for script/config in hook installs
- otherwise fall back to `~/.openpeon` data for default home installs

## What Raycast Can Change

The main command now covers:

- global on/off
- volume
- active pack
- rotation mode
- rotation member list add/remove/clear
- category toggles
- desktop notifications, style, position, dismiss time, mobile notifications, all-screens
- headphones only
- sound effects device
- path rule visibility and removal
- debug on/off
- trainer on/off
- meeting detect
- suppress subagent completion sounds

The extension uses the `peon` CLI or `peon.sh` when a setter command exists. It only writes `config.json` directly for settings that still do not expose setter commands in the current install, such as:

- categories
- headphones only
- sound effects device
- notification all screens
- meeting detect
- suppress subagent complete

Some newer config fields are shown as read-only metadata today so you can inspect them from Raycast without losing parity context:

- notification title override
- notification template count
- silent window seconds
- session start cooldown seconds
- debug retention days

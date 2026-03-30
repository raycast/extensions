# Claude Code Monitor

Real-time monitoring for [Claude Code](https://docs.anthropic.com/en/docs/claude-code) sessions directly from Raycast.

Track active sessions, monitor usage costs, and quickly switch between Claude Code sessions — all without leaving your keyboard.

## Features

### Session Monitoring

- Real-time session status tracking (Active, Waiting for Input, Idle, Ended)
- View session details including project, git branch, model, tokens, and cost
- AI-generated session labels for quick identification
- One-click focus to jump back into any session
- Resume ended sessions directly from Raycast
- Git branch display and worktree detection
- Support for multiple terminals: VS Code, Cursor, Zed, iTerm2, Warp, Ghostty, and more

### Menu Bar Status

- Always-visible menu bar icon showing active session count
- Color-coded status: green (active), orange (waiting for input), yellow (idle)
- Quick access to any session with cost and duration info

### Usage Dashboard

- Cost tracking with daily, weekly, and monthly breakdowns
- Token usage statistics (input, output, cache read, cache creation)
- Per-project and per-model usage breakdown
- Daily cost trend chart

### Extensions Manager

- Browse and manage Claude Code plugins with enable/disable/update/uninstall actions
- View skills from user, command, and plugin sources
- Monitor MCP server status with real-time health checks
- View detailed plugin contents: commands, skills, agents, and MCP servers

## Getting Started

1. Install the extension from the Raycast Store
2. Run the **Setup Claude Code Hooks** command — this configures [Claude Code hooks](https://docs.anthropic.com/en/docs/claude-code/hooks) to report session events
3. Start using Claude Code — sessions will appear automatically

The setup installs a lightweight hook script that notifies the extension when sessions start, update, or end. All data stays local on your machine.

## Commands

| Command | Description |
|---------|-------------|
| **Claude Code Sessions** | List all sessions with real-time status, focus or resume any session |
| **Claude Code Status** | Menu bar icon with session overview and quick actions |
| **Claude Code Usage** | Usage statistics dashboard with cost and token breakdowns |
| **Claude Code Extensions** | Manage plugins, skills, and MCP servers |
| **Setup Claude Code Hooks** | One-click hook installation for session monitoring |

## Preferences

| Preference | Description | Default |
|------------|-------------|---------|
| Default Application | Fallback app to focus when a session's launch terminal is unknown | Terminal.app |

## How It Works

This extension uses [Claude Code hooks](https://docs.anthropic.com/en/docs/claude-code/hooks) to track session lifecycle events. When you run the **Setup Claude Code Hooks** command, it installs a small Python script that:

1. Captures session start, tool use, and stop events
2. Records session metadata (project, terminal, git branch, first prompt)
3. Writes session state to a local JSON file (`~/.claude/claude-code-monitor/sessions.json`)

The extension reads this file to display real-time session status. For usage statistics, it parses Claude Code's JSONL transcript files to extract token counts and calculate costs.

No data leaves your machine — everything is processed locally.

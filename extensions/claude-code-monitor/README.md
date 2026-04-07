# Claude Code Monitor

Real-time monitoring for [Claude Code](https://docs.anthropic.com/en/docs/claude-code) sessions directly from Raycast.

Track active sessions, monitor usage costs, and quickly switch between Claude Code sessions — all without leaving your keyboard.

## Features

### Session Monitoring

- Real-time session status tracking: Active, Waiting for Input, Idle, Ended
- View session details: project, git branch, model, turns, tokens (input, output, cache read), cost, and duration
- AI-generated session labels for quick identification (powered by Claude Haiku)
- One-click focus to jump back into any session's editor or terminal
- Resume ended sessions directly from Raycast
- Git branch display and worktree detection (worktree badge on sessions)
- Show in Finder and copy project path
- Automatic cleanup of stale sessions

**Supported Editors & Terminals:**

| Editors | JetBrains IDEs | Terminals |
|---------|---------------|-----------|
| VS Code | IntelliJ IDEA | Terminal.app |
| Cursor | WebStorm | iTerm2 |
| Zed | PyCharm | Warp |
| Windsurf | GoLand | Ghostty |
| | CLion, PhpStorm, etc. | kitty |
| | | tmux |

Focus action opens the project directly in the editor's CLI. JetBrains IDEs are detected via `TERMINAL_EMULATOR` and focused using the app bundle launcher. Resume copies `claude --resume` to clipboard and opens your chosen terminal at the project directory.

### Menu Bar Status

- Always-visible menu bar icon showing active session count
- Color-coded status: green (active), orange (waiting for input), yellow (idle)
- Session sections: Waiting for Input, Active, Idle, Recently Ended (last 5)
- Each session shows: project name, terminal app, duration, last update, and cost
- Click any session to focus its editor/terminal window
- Quick actions: Open Session List (Cmd+L), Usage Dashboard (Cmd+U)

### Usage Dashboard

- Overview table: today, this week, and this month stats (sessions, cost, tokens)
- Daily cost trend chart (last 7 days)
- Per-model usage breakdown (weekly)
- Per-project cost and token breakdown (weekly)
- Token types tracked: input, output, cache read

### Extensions Manager

**Plugins:**
- Browse enabled and disabled plugins with status indicators
- Actions: enable, disable, update, uninstall
- View plugin details: version, author, scope, source repo, install dates, git SHA
- View plugin contents: commands, skills, agents, MCP servers
- Blocklist status display with reason and detail
- Marketplace update with automatic remote sync

**Skills:**
- Browse user skills, command skills, and plugin skills
- View skill details with invokable slash command info
- Symlink detection for plugin-installed skills
- Actions: view in Finder, copy path, uninstall

**MCP Servers:**
- Monitor server status: Connected, Needs Auth, Unreachable
- Categories: user, cloud (claude.ai), built-in
- View server details: command, args, URL, environment variables
- Actions: open auth URL (for servers needing auth), refresh status, remove
- Health check explanation for unreachable servers

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

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| Cmd+D | View Details |
| Cmd+F | Show in Finder |
| Cmd+C | Copy ID / Name |
| Cmd+Shift+C | Copy Path |
| Cmd+E | Enable / Disable |
| Cmd+U | Update |
| Cmd+O | Open Homepage |
| Cmd+R | Refresh |
| Ctrl+X | Delete / Remove |

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

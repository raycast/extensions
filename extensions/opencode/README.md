# OpenCode Session Manager

Manage [OpenCode](https://opencode.ai) projects and sessions from Raycast.

## Features

- **Search Projects** — browse all your OpenCode projects with session counts, start new sessions, or drill into existing sessions grouped by folder
- **Search Sessions** — find conversations by title or message content using a multi-word scored search, see which sessions are active or open in a terminal
- **New Session** — start a new OpenCode session in any project directory (`Cmd+N`)
- **Focus running sessions** — if a session is already open in iTerm2, selecting it brings that tab to the front instead of opening a new one
- **Terminal support** — iTerm2 (with tab focus), Terminal.app, Warp, Ghostty, and Kitty

## Requirements

- [OpenCode](https://opencode.ai) installed (`brew install anomalyco/tap/opencode`)
- At least one OpenCode session in the database (run `opencode` once in any project)

## Setup

1. Install the extension from the Raycast Store.
2. On first use, the extension starts a lightweight OpenCode server in the background for API access (todos, messages). This is automatic.
3. Open the extension preferences to select your terminal. Auto-detect picks the first running terminal.

## How it works

The extension reads from OpenCode's shared SQLite database to list projects and sessions across all your workspaces. Session liveness is detected by scanning running processes and checking recent database activity. The tab focus feature (iTerm2 and Kitty) matches sessions to terminal tabs by their TTY device.

## Preferences

| Name | Description | Default |
|------|-------------|---------|
| Terminal | Terminal application to open sessions in | Auto-detect |

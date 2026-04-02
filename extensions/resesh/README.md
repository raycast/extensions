# Resesh

Search and resume your [Claude Code](https://docs.anthropic.com/en/docs/claude-code) and [Codex CLI](https://github.com/openai/codex) sessions directly from Raycast.

## Features

- **Full-text search** across all session messages (user prompts and assistant responses)
- **Project filtering** to narrow results by working directory
- **Conversation preview** showing recent messages or search match snippets
- **Resume sessions** in your preferred terminal with one action
- **Open projects** in your IDE or Finder

## Commands

| Command | Description |
|---|---|
| Search Claude Sessions | Search through Claude Code session history |
| Search Codex Sessions | Search through Codex CLI session history |

## Setup

No API keys or credentials required. The extension reads session files stored locally by Claude Code (`~/.claude/projects/`) and Codex CLI (`~/.codex/sessions/`). On Windows, sessions from WSL installations can also be included (see preferences).

### Preferences

| Preference | Description | Default |
|---|---|---|
| Terminal | Terminal app used to resume sessions | Default (Terminal.app on macOS, Windows Terminal on Windows) |
| Include WSL Sessions | Also search for sessions inside WSL distributions (Windows only, minor performance impact) | Off |
| IDE | IDE used to open project directories | VS Code |

**Supported terminals:** Terminal.app, iTerm2, Ghostty, Kitty, Warp, Alacritty, WezTerm, Windows Terminal, PowerShell, Command Prompt

**Supported IDEs:** VS Code, Cursor, Zed, WebStorm, IntelliJ IDEA

# Vibelet Search

Search and resume Claude Code and Codex sessions from Raycast, across both CLI and desktop app session stores.

## Features

- Search four session sources:
  - Claude Code CLI (`~/.claude`)
  - Claude Desktop (`~/Library/Application Support/Claude/claude-code-sessions`)
  - Codex CLI (`~/.codex`)
  - Codex Desktop (`~/.codex`, detected from `originator = "Codex Desktop"`)
- Search by title or full conversation content.
- Open the matched conversation with the matched message and surrounding context pinned at the top.
- Resume CLI sessions in Terminal.app, iTerm, Ghostty, WezTerm, or Warp.
- Open desktop-app sessions in Claude.app or Codex.app.
- Copy a resume command, Markdown transcript, plain-text transcript, session ID, or project path.

## Command

| Command | Description |
| --- | --- |
| Vibelet Search | Browse and search Claude Code and Codex sessions |

## Actions

- `Return` View conversation, or matched context when searching content
- `Command + O` Open in Claude.app or Codex.app
- `Command + T` Resume in the configured terminal
- `Command + R` Copy Resume Command
- `Command + Shift + R` Copy Resume Command with the CLI permission-skip flag
- `Command + Shift + M` Copy Markdown
- `Command + Shift + P` Copy Plain Text
- `Command + Shift + C` Copy Session ID
- Open Project in Finder, when the session has a project path

## Preferences

- Default Terminal: Terminal.app, iTerm, Ghostty, WezTerm, or Warp.
- Claude CLI Path: override the `claude` executable name or path.
- Codex CLI Path: override the `codex` executable name or path.

## How It Works

The extension reads session files directly from disk:

- Claude Code CLI: `~/.claude/sessions/*.json` plus `~/.claude/projects/<encoded-path>/<session>.jsonl`
- Claude Desktop: `~/Library/Application Support/Claude/claude-code-sessions/<user>/<workspace>/local_*.json`
- Codex CLI and Codex Desktop: `~/.codex/sessions/YYYY/MM/DD/rollout-*.jsonl`

Startup indexing reads only the beginning of each session file to extract titles quickly. Full messages are loaded when a conversation is opened.

Full-content search uses ripgrep. The first content search downloads the ripgrep binary into Raycast's support directory if it is not already cached there.

Session content stays on your machine and is never uploaded.

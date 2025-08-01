# Claude Code

Claude Code for Raycast is a powerful extension that seamlessly connects Raycast with the Claude Code CLI. Unlock advanced productivity with five feature-rich commands for managing sessions, launching projects, and extending your workflow through custom commands and intelligent subagents.

## Features

### Core Commands

- **🔍 Session Search** - Advanced Claude Code session browser with intelligent filtering and search
- **🚀 Launch with Claude Code** - Enhanced Finder integration with multi-file/directory selection (System Terminal, iTerm2 supported, more will be supported)
- **📁 Launch Projects** - Project management system with availability status tracking
- **⚙️ User Command Manager** - Custom command creation and management system
- **🤖 User Agents Manager** - Claude Code subagent creation and management


### Prerequisites

- [Claude Code CLI](https://claude.ai/code) installed and configured

## Commands

### Session Search
Browse and search through your Claude Code sessions with intelligent filtering. Parses JSONL session files from `~/.claude/projects` with memory management and timeout protection.

### Launch with Claude Code
Launch Claude Code from Finder selections with multi-file/directory support. Uses AppleScript automation for Terminal launching with robust error handling.

### Launch Projects
Manage and launch projects from your Claude Code project directory. Displays project availability status and provides launching with directory navigation.

### User Command Manager
Create and manage custom commands stored in `~/.claude/commands`. Supports Markdown and YAML formats with custom parameter systems.

### User Agents Manager
Create and manage Claude Code subagents in `~/.claude/agents`. Features tool specification, color organization, and system prompt editing.

## Claude Code Integration

The extension integrates with Claude Code CLI through multiple command patterns:

- Session resumption: `claude -r "{sessionId}"`
- Context launching: `claude --add-dir "{path}"`
- Project launching with proper path resolution and escaping


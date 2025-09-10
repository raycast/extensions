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

Ensure the [Claude Code CLI](https://claude.ai/code) is installed and properly configured. If you haven't set it up yet, follow [this official installation guide](https://www.anthropic.com/claude-code).

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

## How it Works? / Privacy

How does this extension work? This extension reads local data from your `~/.claude` directory (macOS/Linux). It retrieves your Claude Code (Anthropic) CLI configuration and session data from these locations. When accessing AI sessions or projects, the extension interacts directly with the Claude Code CLI, using your local credentials and configuration—just as if you were running commands in your own terminal. If your authentication expires, simply re-authenticate via the Claude Code CLI to restore access.

What data does this extension collect? This extension does not collect or transmit any user data. It only reads from your local Claude Code (Anthropic) configuration and session files, and interacts with the Claude Code CLI in the same way you would manually.

## Support

This plugin is an independent project and is not affiliated with, endorsed by, or in any way officially connected to Anthropic Inc. All trademarks and copyrights related to Claude Code and Anthropic are the property of their respective owners.

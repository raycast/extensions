# Easy Vibe Changelog

## [1.0.0] - 2025-08-19

### ✨ Initial Release

**Easy Vibe** - AI coding toolkit manager for developers.

#### 🚀 Features

**Version Management (Vibe Version)**
- Multi-tool support for Claude Code, Gemini CLI, Qwen Code CLI
- Real-time version detection against latest releases
- Smart updates with CLI native and npm global installation methods
- Visual status indicators for each tool (up-to-date, outdated, unknown)

**Settings Configuration (Vibe Settings)**
- Default AI assistant selection
- Package manager preferences (npm, pnpm, yarn)
- YOLO agent visibility control
- Persistent settings with automatic save/restore

**Quick Launch (Vibe Coding)**
- One-click AI programming assistant launch
- Terminal integration for automatic command execution
- Support for different AI agent command-line arguments

#### 🛠️ Supported AI Tools

| Tool | Package | Update Method | Description |
|------|---------|---------------|-------------|
| **Claude Code** | `@anthropic-ai/claude-code` | CLI Native Update | Anthropic's official AI programming assistant |
| **Gemini CLI** | `@google/gemini-cli` | npm Global Install | Google's Gemini AI tool |
| **Qwen Code CLI** | `@qwen-code/qwen-code` | npm Global Install | Alibaba Cloud's Qwen programming assistant |

#### 🔧 Technical Features

- Modern UI built with Raycast API
- Comprehensive error handling and user feedback
- React Hooks for state management and async operations
- Responsive design for different screen sizes
- Efficient version checking and update mechanisms

#### 📋 Commands

1. **Vibe Version** - View and manage AI tool versions
2. **Vibe Settings** - Configure default options
3. **Vibe Coding** - Quick launch AI assistants
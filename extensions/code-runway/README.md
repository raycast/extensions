# Code Runway

A powerful Raycast extension for quickly searching and launching development projects in terminals and editors, with multi-terminal split panes, tabs, and more — perfect for Vibe Coding.

[中文文档](https://github.com/gongchunru/raycast-code-runway/blob/main/README_CN.md) | [English](https://github.com/gongchunru/raycast-code-runway/blob/main/README.md)

## ✨ Features

- 🔍 **Smart Project Discovery**: Automatically scans and indexes projects in configured directories
- 🚀 **Quick Launch**: One-click project startup with customizable templates
- 🖥️ **Multi-Terminal Support**: Works with **Warp**, **Ghostty**, **iTerm**, and **cmux**
- ✏️ **Editor Integration**: Launch projects directly in **Cursor**, **Windsurf**, **VS Code**, **Codex**, and more
- 🎯 **Launch Templates**: Pre-defined templates for different development scenarios
- ⭐ **Default Template**: Set your preferred template as default for ultra-fast startup
- ⚙️ **Configurable Enter Key**: Choose whether Enter launches the default template or shows template picker
- 🛠️ **Custom Commands**: Configure multiple terminal commands with custom working directories
- 📁 **Directory Management**: Easy project directory management with enable/disable controls
- 🎨 **Native App Icons**: Template list displays native terminal/editor icons automatically

## 📋 Requirements

- [Raycast](https://raycast.com/) — Required
- A supported terminal or editor:
  - **Terminals**: [Warp](https://www.warp.dev/), [Ghostty](https://ghostty.org/), [iTerm](https://iterm2.com/), [cmux](https://cmux.dev/)
  - **Editors**: [Cursor](https://cursor.sh/), [Windsurf](https://codeium.com/windsurf), [VS Code](https://code.visualstudio.com/), [Codex](https://openai.com/codex/), and others

## 🚀 Quick Start

### 1. Configure Project Directories

First, add your project root directories:

1. Open Raycast and search for **"Project Directory Settings"**
2. Click **"Add New Directory"** or press `Cmd + N`
3. Select your project root directories (multiple selection supported)
4. Optional: Add a display name prefix to organize directories

The extension will automatically scan these directories for projects.

### 2. Search and Launch Projects

1. Open Raycast and search for **"Search Projects"**
2. Type to search for your projects
3. Press `Enter` to launch:
   - By default, launches with the **default template** instantly
   - Or configure Enter to open the **template picker** in extension preferences

![search-projects](metadata/code-runway-5.png)

### 3. Manage Templates

Create and customize launch templates:

1. Search for **"Launch Templates"**
2. Create new templates or edit existing ones
3. Choose your terminal (Warp, Ghostty, iTerm, cmux) or editor (Cursor, Windsurf, Codex, etc.)
4. Configure split direction, launch mode, and commands
5. Set a template as default using the **"Set as Default"** action (`Cmd + D`)

![manage-templates](metadata/code-runway-8.png)

## 🔍 Project Detection

Projects are automatically detected by the presence of these files:

- `package.json` (Node.js/JavaScript)
- `Cargo.toml` (Rust)
- `go.mod` (Go)
- `pom.xml` / `build.gradle` (Java)
- `requirements.txt` / `pyproject.toml` (Python)
- `Gemfile` (Ruby)
- `composer.json` (PHP)
- `.git` (Git repository)
- `Makefile` / `CMakeLists.txt` (C/C++)
- `Dockerfile` (Docker)

## ⌨️ Keyboard Shortcuts

- `Enter`: Launch project (behavior configurable in preferences)
- `Cmd + R`: Refresh project list
- `Cmd + Shift + R`: Refresh templates
- `Cmd + N`: Add new directory (in Project Directory Settings)
- `Cmd + D`: Set template as default (in Template Management)

## 🔧 Available Commands

| Command                        | Description                                     |
| ------------------------------ | ----------------------------------------------- |
| **Search Projects**            | Search and launch your development projects     |
| **Project Directory Settings** | Manage project directories with full controls   |
| **Launch Templates**           | Create and manage terminal and editor templates |

## 🎨 Template Customization

### Launcher Types

![launcher-types](metadata/code-runway-6.png)

Templates support three launcher types:

| Type | Description | Best For |
| ---- | ----------- | -------- |
| **Terminal** | Opens the project in a terminal with split panes, tabs, or windows | Running commands — dev servers, AI agents, build tools |
| **Editor** | Opens the project directory directly in an editor | Quickly opening projects in Cursor, VS Code, Codex, etc. |
| **Script** | Runs a custom Bash script with the project path passed as `$1` and via environment variables | Custom workflows — combining tools, running AppleScript, etc. |

> **Available variables** in Script templates:
> - `$1` — project path
> - `CODE_RUNWAY_PROJECT_PATH` — full project path
> - `CODE_RUNWAY_PROJECT_NAME` — project name

### Creating Custom Templates

1. Open **"Launch Templates"**
2. Click **"New Template"**
3. Configure:
   - **Launcher Type**: Terminal, Editor, or Script
   - **Terminal / Editor**: Choose your preferred app (Terminal and Editor types)
   - **Script Content**: Enter a Bash script (Script type)
   - **Split Direction**: Left / Right or Top / Bottom (Warp, Ghostty & cmux)
   - **Launch Mode**: Split panes, multi-tab, or multi-window
   - **Commands**: Add multiple commands with custom working directories

### Launch Modes (Terminal type)

| Mode | Description | Best For |
| ---- | ----------- | -------- |
| **Split Panes** | All commands arranged as split panes in one window, with configurable Left/Right or Top/Bottom direction | Viewing multiple outputs side by side — e.g. frontend + backend + AI agent |
| **Multi-Tab** | Each command opens in a separate tab within the same window | Many commands that don't need simultaneous viewing |
| **Multi-Window** | Each command opens in its own window | Spreading terminals across desktops or displays |

### Launch in Terminal

Launch `Claude Code` and `Codex CLI` in Ghostty with split panes in a new window:
![terminal-launch](metadata/code-runway-9.png)

### Launch in Editor

Open projects in Cursor, Windsurf, Codex, and more:
![editor-launch](metadata/code-runway-7.png)

### Example: Custom Script Templates

```bash
# Simplest usage: open project in Cursor
cursor "$1"
```

```bash
# Install dependencies and open in Xcode
cd "$1" && pod install && open *.xcworkspace
```

```bash
# Start Docker environment and open editor
cd "$1" && docker compose up -d && cursor .
```

```bash
# Run a project-specific setup script
"$CODE_RUNWAY_PROJECT_PATH/scripts/dev-setup.sh"
```

## 🖥️ Terminal Support

| Feature              | Warp | Ghostty | cmux | iTerm |
| -------------------- | ---- | ------- | ---- | ----- |
| Split panes          | ✅   | ✅      | ✅   | ❌    |
| Multiple tabs        | ✅   | ✅      | ✅   | ❌    |
| Multiple windows     | ✅   | ✅      | ✅   | ❌    |
| Custom split direction | ✅ | ✅      | ✅   | ❌    |
| Per-pane commands    | ✅   | ✅      | ✅   | ✅    |
| Working directory    | ✅   | ✅      | ✅   | ✅    |

For detailed terminal integration information, see [Terminal Support](https://github.com/gongchunru/raycast-code-runway/blob/main/TERMINAL_SUPPORT.md).

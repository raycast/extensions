# Hole Sandbox Launcher

A [Raycast](https://raycast.com) extension for quickly launching [Hole](https://github.com/lukashornych/hole) sandbox environments in your projects.

## Prerequisites

- [Hole](https://github.com/lukashornych/hole) installed and available on your PATH
- [Raycast](https://raycast.com)

## Usage

Open the extension in Raycast and you'll see two inputs:

1. **Agent** (dropdown) — pick the AI agent to use: Claude, Gemini, or Codex
2. **Project path** (search bar) — type a path to your project directory, or select one from your recent projects

Press **Enter** to launch the sandbox. The extension runs `hole start <agent> <path>` in your chosen terminal.

### Recent projects

The extension remembers your last 10 project paths. They appear as a filterable list below the search bar. Remove a path with **Cmd+D**.

### Terminal selection

Use the **Open In...** action menu to pick which terminal app to use. The extension remembers your last choice.

Supported terminals:

- Terminal (macOS built-in)
- iTerm2
- Warp
- Alacritty
- Kitty
- WezTerm
- Ghostty

Only terminals installed on your system are shown.

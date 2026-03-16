# WSL

Execute commands in Windows Subsystem for Linux directly from Raycast.

## Features

### Execute WSL Command

Type a command and see live streaming output inline. Supports shell history browsing from bash, zsh, or fish — search and re-run previous commands without leaving Raycast.

### List WSL Distros

View all installed WSL distributions with their running state, WSL version, and default status. Set any distro as the default directly from the list.

### Open WSL Terminal

Instantly launch Windows Terminal with your default WSL distribution. No UI — just a quick keyboard shortcut away.

## Requirements

- **Windows 10/11** with [WSL](https://learn.microsoft.com/en-us/windows/wsl/install) installed
- At least one Linux distribution installed in WSL (e.g., Ubuntu)
- [Windows Terminal](https://aka.ms/terminal) (optional, required for "Open WSL Terminal" command)

## Preferences

| Preference | Type | Default | Description |
|---|---|---|---|
| Default WSL Distro | Text | _(WSL default)_ | Name of the WSL distribution to use (e.g., Ubuntu) |
| Working Directory | Text | `~` | Default working directory inside WSL |
| Shell History Source | Dropdown | Bash | Which shell history file to read (Bash, Zsh, or Fish) |

## Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| `Enter` | Execute command / Open detail |
| `Cmd+T` | Open in Windows Terminal |
| `Cmd+E` | Edit command |
| `Cmd+Shift+C` | Copy command or output |
| `Cmd+D` | Set as default distro |
| `Cmd+R` | Refresh list |
| `Ctrl+X` | Remove from recently used |

## Troubleshooting

- **"wsl.exe not found"** — WSL is not installed. Run `wsl --install` in PowerShell as administrator.
- **Garbled text in distro list** — This is a known encoding issue. Please report it if you encounter it.
- **Empty shell history** — Make sure the Shell History Source preference matches the shell you use inside WSL (bash, zsh, or fish).
- **Command seems to hang** — Interactive commands like `top` or `vim` don't work inline. Use "Open WSL Terminal" for interactive sessions.
- **Windows Terminal doesn't open** — Ensure Windows Terminal is installed from the Microsoft Store or winget.

## Screenshots

> Screenshots should be placed in the `metadata/` directory as PNG files at 2000x1250 resolution (16:10 aspect ratio).

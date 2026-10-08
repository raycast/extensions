# WSL Manager for Raycast

Manage your Windows Subsystem for Linux (WSL) distributions and projects seamlessy from Raycast.

## Features

### Distro Management (`list-distros`)
View and control all your installed WSL distributions in one place.
- **Start/Stop**: Silently start distros in the background or terminate them to free up resources.
- **Install/Uninstall**: Browse the online registry to install new distros or remove old ones.
- **Launch Terminal**: Launch specific terminal windows for any running distro.

### Smart Project Opener (`open-project`)
Instantly find and open your projects across **all** your active distributions.
- **Multi-Distro Scanning**: Automatically detects projects in `~/` across Ubuntu, Debian, CachyOS, and more.
- **Universal Editor Support**: Opens projects in **VS Code**, **Cursor**, **Sublime Text**, or any editor you prefer.
- **Zero Config**: Intelligently detects your installed editors and just works.

## Installation

1. Install [Raycast](https://www.raycast.com/).
2. Search for "WSL Manager" in the Raycast Store.
3. Install the extension.

## Requirements

- Windows 10/11 with WSL 2 enabled.
- `wsl.exe` accessible in your PATH.

## Configuration

The extension works out of the box, but you can customize your experience:

- **Editor Preference**: Choose your default editor dynamically from the "Open Project" command dropdown.
- **Custom Paths**: (Coming Soon) Configure specific search paths for your projects.

## License

MIT

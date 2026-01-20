# Ghostty Launcher

Launch recent projects and workspaces in Ghostty terminal.

## Features

### Recent Projects

Browse and open projects you've recently worked on. The extension scans your development directories to find projects with markers like `.git`, `package.json`, `Cargo.toml`, `go.mod`, and `pyproject.toml`.

![Recent Projects](metadata/ghostty-launcher-1.jpeg)

#### Configuration

- **Project Directories**: Set the directories to scan in extension preferences (default: `~/Projects,~/Code,~/Development,~/Documents/dev`)
- **Scan Depth**: Configure how deep to scan (1-3 levels recommended)
- **Shell History**: Optionally parse shell history for additional recent directories

### Workspaces

Save groups of projects and open them all as Ghostty tabs with one click. Perfect for switching between different work contexts.

![Workspaces](metadata/ghostty-launcher-2.jpeg)

- Create workspaces by selecting from your recent projects or adding custom directories
- Open a workspace to launch all projects as tabs in a single Ghostty window
- Edit or delete workspaces as needed

### Create Workspace

![Create Workspace](metadata/ghostty-launcher-3.jpeg)

### New Window

Quickly open a new Ghostty window in any directory.

### Open Config

Open your Ghostty configuration file in your preferred editor.

## Requirements

- [Ghostty](https://ghostty.org/) terminal must be installed

# Mise Manager for Raycast

Manage your [mise](https://mise.jdx.dev/) tools, plugins, configuration, and tasks directly from Raycast.

This extension provides a comprehensive GUI for the `mise` CLI, allowing you to install tools, manage versions, edit configuration, and run tasks without leaving your launcher.

## Features

### 🛠️ Tool Management
- **Show Installed**: View all installed tools, their versions, and status (active/inactive).
  - Filter by Active, Global, Local, or Unused tools.
  - Set specific versions as Global.
  - Pin versions to specific project directories.
  - Uninstall specific versions.
- **Search Registry**: Browse the entire mise registry.
  - Install tools with one click.
  - Choose specific versions to install.
  - Select installation backends (e.g., `cargo`, `npm`, `pip`, `go`).
  - Visually identify tools you already have installed.
- **Show Outdated**: See which tools have updates available.
  - Upgrade individual tools with a single action.
  - View release notes (via homepage links).
- **Upgrade Tool**: A dedicated command to select and upgrade installed tools.

### 🔌 Plugin Management
- **Add Plugin**: Install new plugins by name or custom Git URL.
- **Remove Plugin**: Uninstall plugins you no longer need.
- **Update Plugins**: Update all plugins to their latest revisions (background task).
- **Install Using Backend**: Browse available backends and install tools specifically using them (e.g., `mise use cargo:ripgrep`).

### ⚙️ Configuration & Maintenance
- **Settings**: View and edit mise configuration (`mise settings`).
  - Toggle boolean settings.
  - Edit values directly.
- **Doctor**: Run `mise doctor` to diagnose issues.
  - View detailed, colorized output of your environment, paths, and build info.
- **Prune**: Clean up unused tool versions to free up disk space.
- **Clean Cache**: clear the mise download cache.
- **Reshim**: Regenerate shims to fix path issues.
- **Upgrade Mise**: Update the `mise` CLI itself (supports both standalone and Homebrew installations).

### 📋 Task Runner
- **Run Task**: List and copy run commands for tasks defined in your `mise.toml`.

## Prerequisites

- **Raycast**: The launcher.
- **mise**: The CLI tool must be installed.
  - **macOS (Homebrew):** `brew install mise`
  - **Standalone:** `curl https://mise.run | sh`
  - Ensure `mise` is in your PATH. The extension automatically checks standard locations (`/opt/homebrew/bin`, `/usr/local/bin`, `~/.local/bin`).

## Troubleshooting

- **"Command failed: mise ...":** Ensure `mise` is installed and accessible.
- **Output issues:** If you see strange characters, the extension tries to strip color codes, but raw output might sometimes leak.
- **Homebrew:** If you installed mise via Homebrew, the "Upgrade Mise" command will attempt to use `brew upgrade mise`.

## License

MIT
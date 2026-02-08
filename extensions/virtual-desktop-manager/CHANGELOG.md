# Changelog

All notable changes to the Virtual Desktop Manager extension will be documented in this file.

## [1.0.0] - 2026-02-08

### Added

#### Raycast Commands
- **Go to Desktop 1-5** - Switch to specific virtual desktops
- **Go to Next Desktop** - Navigate to the next desktop (wraps around)
- **Go to Previous Desktop** - Navigate to the previous desktop (wraps around)
- **Move Window to Desktop 1-5 & Follow** - Move active window and switch to that desktop
- **Move Window to Desktop 1-3 (Stay)** - Move active window without switching
- **Move Window to Next/Previous Desktop** - Move window left/right and follow
- **Create Desktop & Switch** - Create a new desktop and switch to it
- **Create Desktop (Stay)** - Create a new desktop but stay on current
- **Remove Current Desktop** - Remove the current virtual desktop
- **Ensure 5 Desktops Exist** - Create desktops until at least 5 exist
- **Toggle Pin Window** - Toggle pin window to all desktops
- **Pin Window** - Explicitly pin window to all desktops
- **Unpin Window** - Explicitly unpin window
- **Check Window Pinned** - Check if active window is pinned (shows HUD)
- **Toggle Pin App** - Toggle pin app to all desktops
- **Pin App** - Explicitly pin app to all desktops
- **Unpin App** - Explicitly unpin app
- **Check App Pinned** - Check if active app is pinned (shows HUD)
- **Show Current Desktop** - Display current desktop number via HUD
- **Show Desktop Count** - Display total number of desktops via HUD

#### Daemon Management
- **Run Keybindings Daemon** - Start or reload the background hotkey script
- **Stop Keybindings Daemon** - Stop the background hotkey script

#### Configuration
- **View Keyboard Shortcuts** - View all available shortcuts at a glance
- **Edit Keybindings** - Customize hotkeys for all commands with a visual editor

### Features
- Full integration with [VD.ahk](https://github.com/FuPeiJiang/VD.ahk) library
- Background daemon for system-wide keyboard shortcuts
- Customizable keybindings with AHK syntax support
- Automatic daemon reload when saving keybinding changes
- Getter commands use Raycast HUD for non-intrusive feedback


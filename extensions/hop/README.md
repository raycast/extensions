# Hop

Fast SSH connection manager for Raycast. Fuzzy search and connect to servers from your [hop](https://github.com/danmartuszewski/hop) config.

## Features

- **Fuzzy Search** - Find connections instantly
- **Quick Connect** - Open SSH in your preferred terminal
- **Recent First** - Most used connections at the top
- **Project Grouping** - Connections organized by project
- **Environment Tags** - Color-coded labels (prod/staging/dev)
- **Multiple Terminals** - Terminal.app, iTerm, Warp, Alacritty, Kitty

## Prerequisites

- [hop](https://github.com/danmartuszewski/hop) CLI installed and configured
- At least one connection in `~/.config/hop/config.yaml`

## Usage

1. Open Raycast
2. Type "Connect" or "Hop"
3. Search for your server
4. Press Enter to connect

## Keyboard Shortcuts

| Action | Shortcut |
|--------|----------|
| Connect | Enter |
| Copy SSH Command | Cmd+C |
| Copy Host | Cmd+Shift+C |
| Copy User@Host | Cmd+Option+C |

## Configuration

Set your preferred terminal in Extension Preferences. Override config path if needed.

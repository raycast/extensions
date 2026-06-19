# Rayspaces

A Raycast extension for browsing and navigating [AeroSpace](https://github.com/nikitabobko/AeroSpace) tiling window manager workspaces and their windows.

## Features

- Master-detail view: workspaces on the left, window list on the right
- Search workspaces by app name or window title
- Monitor info and window count shown in the detail panel
- Focus a workspace with Enter
- Focus a specific window via Cmd+Shift+F submenu

## Usage

1. Open Raycast
2. Run the `Browse Spaces` command
3. Arrow keys to browse workspaces; the right panel shows all windows
4. Enter to switch to the selected workspace
5. Cmd+Shift+F to pick and focus a specific window

## Requirements

- macOS
- [AeroSpace](https://github.com/nikitabobko/AeroSpace) window manager
- Raycast

## Development

```bash
npm install
npm run dev
```
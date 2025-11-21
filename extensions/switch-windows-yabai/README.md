# Yabai Window Switcher for Raycast

A powerful Raycast extension for managing windows with yabai window manager.

## Prerequisites

- [Raycast](https://raycast.com/)
- [yabai](https://github.com/koekeishiya/yabai) window manager properly installed and configured
- Make sure yabai is accessible in your PATH

## Features

This extension provides a streamlined interface for managing your windows using yabai within Raycast.

### Window Management

- **Switch to Window** (Enter): Focus on the selected window
- **Aggregate to Space** (⌘⇧M): Move selected window to current space
- **Close Window** (⌘⇧W): Close the selected window
- **Close Empty Spaces** (⌘⇧Q): Remove spaces that don't contain any windows

### Display Management

- **Disperse Windows for Display #N** (⌘⇧1, ⌘⇧2, etc.): Distribute windows across spaces on the specified display

## Usage

1. Launch Raycast
2. Search for "Switch Windows (yabai)"
3. Use the search bar to filter windows by application name or window title
4. Select a window and use the actions in the action panel

### Display Filtering

You can filter windows by specific displays using the `#N` syntax:

- **`#3`** - Show only windows on display 3
- **`#2 chrome`** - Show Chrome windows on display 2
- **`#1 terminal`** - Show Terminal windows on display 1

**Examples:**
- Type `#2` to see all windows on display 2
- Type `#1 code` to find VS Code windows on display 1
- Type `#3 safari` to find Safari windows on display 3

**Note:** Display filters only work when placed at the beginning of your search. For example, `chrome #2` will search for "chrome #2" as regular text, not filter by display.

## Notes

- Windows are sorted by most recently used for quick access
- The extension maintains a history of your window usage across sessions
- Window switching history is persisted using Raycast's LocalStorage

## Troubleshooting

If you encounter issues:
- Ensure yabai is running (`yabai --check-sa`)
- Verify yabai permissions are properly set up
- Check that yabai commands work from terminal

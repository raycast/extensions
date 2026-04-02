# Tmux Cheatsheet for Raycast

A searchable, categorized cheatsheet for tmux commands. Find any command instantly, see your custom keybindings, and paste directly into the terminal.

## Features

- **Grouped by Category** — Commands organized into Session, Window, Pane, Resize, Copy/Paste, Layout, Miscellaneous, and Zoom sections
- **Fuzzy Search** — Search by command name, description, shortcut key, or category
- **Category Filter** — Dropdown to filter commands by category
- **Auto-Detected Prefix** — Reads your `~/.tmux.conf` (or XDG config) and displays shortcuts with your actual prefix
- **Custom Keybinding Detection** — Parses `bind`/`bind-key` lines from your tmux config and shows your custom bindings instead of defaults
- **Pretty Key Formatting** — Displays `C-a` as `⌃A`, arrow keys as `↑↓←→`, etc.
- **Paste to Terminal** — Paste any command directly into the frontmost app
- **Detailed View** — Select a command to see its terminal syntax, shortcut, and a description of why it's useful

## Usage

1. Open Raycast and search for **Search Tmux Commands**
2. Browse commands grouped by category, or start typing to fuzzy search
3. Use the category dropdown to filter
4. Press Enter to view details, or use actions to copy/paste the command

## Prefix Override

By default the extension auto-detects your prefix from `~/.tmux.conf`. To override it manually, open the extension preferences in Raycast and set **Tmux Prefix Override**.

# Neovim

Manage Neovim sessions, plugins, and keymaps from Raycast.

## Features

- Search and open recent Neovim sessions (persistence.nvim sessions and recently opened directories)
- Open selected Finder files or folders in Neovim
- Open a new Neovim window in your terminal of choice
- Browse installed plugins from `lazy-lock.json` with GitHub links where the repository is known
- Search keymaps from your running Neovim config (queries `nvim --headless` at runtime)
- Pin, unpin, and reorder favorite sessions
- Grid or list layout preference

## Requirements

- [Neovim](https://neovim.io/) installed and available on your `PATH` (or configured explicitly)
- One or more supported terminal apps: Terminal.app, iTerm2, Ghostty, kitty, Alacritty, or WezTerm

## Configuration

All settings are available in the extension's preferences:

- **Terminal App** — which terminal to launch Neovim in (`Auto-detect` uses the first available in priority order). The default is `Auto-detect`.
- **Nvim Path** — path to the `nvim` binary. Defaults to `nvim`, resolved via `PATH` with a fallback to common Homebrew/usr locations.
- **View Layout** — `List` or `Grid` layout for the sessions view.

### Session sources

Recent sessions are merged from two sources:

- **persistence.nvim** — session files under `$XDG_STATE_HOME/nvim/sessions` (default `~/.local/state/nvim/sessions`)
- **Recent directories** — directories you've opened, tracked by this extension in its own support directory

The keymap reference sources your keymap config from `$XDG_CONFIG_HOME/nvim/lua/config/keymaps.lua` (default `~/.config/nvim/lua/config/keymaps.lua`) when available.

## Privacy

This extension runs entirely locally. It reads session, plugin, and keymap data from files on your machine and launches Neovim in a terminal. No data is sent to any remote service.

**Tested with:** Ghostty and Terminal.app + LazyVim. Contributions for other terminals (iTerm2, kitty, Alacritty, WezTerm) and Neovim distributions are welcome.

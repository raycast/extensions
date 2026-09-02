# Neovim Changelog

## [Fix keymap scanner nested-bracket framing] - 2026-09-02

- Fix keymap scanner parsing a bracketed string value (e.g. `rhs "echo [1,2]"`) as the payload instead of the enclosing JSON array, which caused user keymaps to silently disappear.

## [Initial Version] - 2026-09-02

- Search and open recent Neovim sessions (persistence.nvim sessions, recently opened directories)
- Open selected Finder files/folders in Neovim
- Open a new Neovim window in any terminal
- Browse installed plugins from lazy-lock.json with GitHub links where known
- Dynamic keymap reference with favorites (queries nvim --headless at runtime)
- Grid and list layout preference
- Auto-detect terminal (iTerm2, Ghostty, kitty, Alacritty, WezTerm, Terminal.app)
- Pin/unpin and reorder favorite sessions
- XDG path support for custom `XDG_STATE_HOME` / `XDG_CONFIG_HOME`

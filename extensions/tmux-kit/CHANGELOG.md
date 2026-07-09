# Tmux Kit Changelog

## [Initial Release] - {PR_MERGE_DATE}

- Tmux Sessions: live session list with switch-client, copy attach command, rename, kill, kill-all-others, and drill into panes & processes
- Pane actions: view pane content in a Detail view, copy pane content to clipboard, break pane to new window, mark / swap with marked pane, directional swap (swap a pane with its adjacent pane left/right/up/down via `swap-pane -s/-t -d`), clear pane scrollback, kill pane or kill all other panes in the window
- Window actions (from any pane): switch to window, rename window, create a new window in the current session, and kill the entire window
- Native macOS folder picker when creating new sessions, with a `defaultStartDir` preference for the pre-filled directory
- Tmux Cheatsheet: ~60 entries across Core, Window, Pane, Session, Copy mode, Misc, Command mode, Resurrect, and Files sections, with copy-to-clipboard on every entry
- Run Tmux Command: arbitrary tmux input with stdout/stderr detail view, 10 quick presets, and per-user history (last 20)
- Tmux Resurrect Save / Restore: one-shot no-view commands wrapping the tmux-resurrect plugin scripts

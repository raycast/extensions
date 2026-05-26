# Tmux Kit

A Raycast extension for tmux: cheatsheet + session manager + arbitrary command runner + tmux-resurrect save/restore — all without leaving Raycast.

## Commands

- **Tmux Cheatsheet** — searchable reference for tmux key bindings and commands (panes, windows, sessions, copy mode, command mode, resurrect). Copy any shortcut, command, or shell snippet to the clipboard.
- **Tmux Sessions** — list current sessions; rename, kill, kill-others, switch the focused client, copy the attach command, and drill into panes/processes per session.
- **Run Tmux Command** — type any tmux command (like `prefix :` inside tmux), see stdout/stderr in a detail view. Quick presets and command history included.
- **Tmux Resurrect Save** — snapshot the current layout via [tmux-resurrect](https://github.com/tmux-plugins/tmux-resurrect).
- **Tmux Resurrect Restore** — restore the last tmux-resurrect snapshot.

## Requirements

- macOS
- tmux installed (Homebrew on Apple Silicon: `brew install tmux`)
- For Resurrect Save/Restore commands: [tmux-resurrect](https://github.com/tmux-plugins/tmux-resurrect) installed at `~/.tmux/plugins/tmux-resurrect/`.

## Preferences

- **Tmux binary path** — absolute path to the `tmux` binary. Default `/opt/homebrew/bin/tmux` (Homebrew on Apple Silicon). Intel Macs usually need `/usr/local/bin/tmux`.
- **Default start directory** — optional default working directory pre-filled when creating a new session. Defaults to `$HOME`.

## Notes

- Works with any tmux prefix key (default `Ctrl+b`, or remapped like `Ctrl+a`). The cheatsheet uses the abstract label `prefix`.

## License

MIT.

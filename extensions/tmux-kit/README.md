# Tmux Kit

The full tmux workflow inside Raycast — search keybindings, manage sessions, run arbitrary tmux commands, and persist layouts with tmux-resurrect. No more reaching for a terminal just to remember `prefix : kill-session -a` or to clean up stale sessions.

## Why this extension

Existing terminal launchers either drop you into the shell every time you need to inspect tmux, or stop at "list sessions." Tmux Kit treats tmux as a first-class workspace:

- **Read** — a fully searchable cheatsheet (panes, windows, sessions, copy mode, command mode, resurrect, file locations) with copy-to-clipboard on every entry.
- **Inspect** — live session list with attached/detached status, window count, last-activity timestamp, plus drill-down into every pane (PID, command, path, dimensions).
- **Mutate** — rename, kill, kill-others, switch the focused client, attach via clipboard, create new sessions with a native folder picker for the start directory.
- **Script** — send arbitrary tmux commands (mirroring `prefix :`) with history and quick presets, and capture stdout/stderr in a detail view.
- **Persist** — one-shot save/restore via `tmux-resurrect`.

Everything works against any prefix key (default `Ctrl+b` or remapped, like `Ctrl+a`). The cheatsheet uses the abstract label `prefix`.

## Commands

### Tmux Cheatsheet (`view`)

Searchable reference for stock tmux key bindings and commands. **~60 entries across 9 sections:**

- **Core** — detach, attach, list, new named session, kill by name, kill server.
- **Window** — create, next/previous/last, jump-to-N, picker (`prefix w`), rename, kill, move to index.
- **Pane** — split horizontally/vertically, cycle, navigate by arrow, zoom (`prefix z`), show numbers (`prefix q`), kill, swap with `{` / `}`, resize, break to new window, cycle layouts.
- **Session** — picker (`prefix s`), previous/next, rename.
- **Copy mode** — enter, begin selection (vi mode), yank to clipboard (with the `set -s copy-command 'pbcopy'` recipe), exit, search forward/backward.
- **Misc** — list keybindings (`prefix ?`), command mode (`prefix :`), reload config, clock.
- **Command mode** — `clear-history`, `kill-session`, `kill-session -a`, rename, move-window, swap-window, mouse toggle, status toggle, find-window, respawn-pane, display-panes, list-keys, cross-session window move.
- **Resurrect** — overview of `tmux-resurrect`, default save/restore key bindings, and the equivalent `run-shell` commands.
- **Files** — `~/.tmux.conf` and the TPM plugin directory.

Every entry exposes copy-to-clipboard actions for any of its shortcut, command, or shell payload, plus a detail view with markdown rendering.

### Tmux Sessions (`view`)

Live view of `tmux list-sessions` parsed structurally:

- **Per-row info** — name, current window, attached indicator (green dot vs hollow circle), window count, last-activity timestamp.
- **Switch Client to Session** — invokes `tmux switch-client -t <name>` against the attached client, with a pre-check via `list-clients` so the action is suppressed gracefully when no terminal client is attached.
- **Copy Attach Command** — produces a shell-safe `tmux attach -t <name>` (with quoting) for pasting into a new terminal.
- **Rename Session** — form with live validation (names cannot contain spaces, colons, or dots — tmux's actual target syntax).
- **New Session** — form with **native macOS folder picker** for the start directory (or use the configured default). Sessions are created detached (`-d`), then you Switch / Copy Attach to enter.
- **Show Panes & Processes** — drill into every pane in the session, grouped by window, showing PID, current command, working directory, dimensions, and active-pane marker. Each pane is killable individually.
- **Kill Session / Kill All Other Sessions** — destructive actions are gated by `confirmAlert`.

### Run Tmux Command (`view`)

Form for arbitrary tmux input, mirroring `prefix :`:

- Submit runs `tmux <input>` via `/bin/sh -c` so quoting and variable expansion follow shell semantics — same as typing from your shell.
- Result is rendered in a Detail view with separate stdout and stderr code blocks, plus copy actions for each.
- **Quick presets** — 10 common commands (`list-sessions`, `list-windows`, `list-clients`, `kill-session -a`, `show-options -g`, `clear-history`, mouse on/off, status on/off, `find-window`, `display-message '#{pane_current_path}'`).
- **Per-user history** — last 20 commands persisted via `LocalStorage`, accessible via a sub-menu and a one-tap clear action.

### Tmux Resurrect Save (`no-view`) / Tmux Resurrect Restore (`no-view`)

One-shot wrappers around `~/.tmux/plugins/tmux-resurrect/scripts/save.sh` and `restore.sh`. Show a HUD on success, a toast with the underlying error on failure (helps if the plugin isn't installed at the expected path).

## Design highlights

- **No personal preset leakage.** Every label, default, and example was scrubbed for general use. The cheatsheet covers only stock tmux defaults, not the author's `~/.zshrc` shortcuts.
- **Resilient to a missing tmux server.** `listSessions` recognizes "no server running" stderr and returns an empty list (with a clear empty-state action to create the first session), rather than treating it as an error.
- **Argument-safe.** All tmux calls go through `execFile` with explicit positional arguments — no shell interpolation, no injection surface, including for arbitrary session/pane names. The single intentional exception is "Run Tmux Command," which goes through `/bin/sh -c` precisely to preserve `prefix :` quoting semantics.
- **Robust delimiter.** Session and pane data are parsed from a `||SEP||` multi-character delimiter rather than tab, because tab and single-byte control characters get normalized by the Raycast runtime layer. Documented in `src/lib/tmux.ts`.
- **Reserved-shortcut compliant.** Cmd+P is left to Raycast's "Print" reservation; all extension shortcuts use other keys (Cmd+B for "Show Panes & Processes", Cmd+I for "Copy PID", etc.).
- **Bilingual-free.** All user-facing strings are English. The cheatsheet was rewritten from the original bilingual draft for Store reach.

## Preferences

| Name | Type | Default | Purpose |
|------|------|---------|---------|
| Tmux binary path | textfield | `/opt/homebrew/bin/tmux` | Path to the `tmux` binary. Intel Macs typically need `/usr/local/bin/tmux`. |
| Default start directory | textfield | _(empty → `$HOME`)_ | Pre-filled in the new-session folder picker. |

## Requirements

- macOS (the extension declares `platforms: ["macOS"]`).
- `tmux` installed and reachable at the configured path.
- For Resurrect Save / Restore: [tmux-resurrect](https://github.com/tmux-plugins/tmux-resurrect) installed at `~/.tmux/plugins/tmux-resurrect/`.

## Compatibility notes

- Works whether tmux is running on a separate client (Terminal.app, iTerm, Ghostty, WezTerm, Kitty, Alacritty, etc.) or not running at all.
- "Switch Client to Session" requires at least one attached terminal client (the extension itself is not a tmux client). If no client is attached, use "Copy Attach Command" instead.
- The cheatsheet's `vi`-mode copy entries assume `set -g mode-keys vi`. The shortcuts still document the standard tmux semantic and are equally useful as a learning reference.

## License

MIT.

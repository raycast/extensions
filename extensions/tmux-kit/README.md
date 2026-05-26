# Tmux Kit

Live tmux session management from the Raycast launcher — list, switch, rename, kill, drill into panes, and spin up new sessions with a native folder picker. Plus a complete cheatsheet, an arbitrary-command runner, and tmux-resurrect save/restore. The whole tmux workflow without ever opening a terminal first.

## Session management is the core

Most tmux launchers stop at "show me a list." Tmux Kit is built around the idea that the launcher is the right place to operate tmux:

- **One Enter to switch.** Selecting a session calls `tmux switch-client -t` against the attached terminal client. No prefix, no command mode, no second keystroke.
- **Native folder picker for new sessions.** No more typing `/Users/me/Projects/...` by hand — click the folder chip, browse in macOS Finder, pick a directory, done.
- **Live status, not stale text.** Each row shows attached state (filled vs hollow circle), window count, current window name, and last-activity timestamp parsed from tmux's own format engine.
- **Safe destructive actions.** Kill and Kill-Others are gated behind a confirm alert with a destructive-style red button, so muscle memory doesn't wipe a session.
- **Two ways to enter a session.** Switch Client when you already have a terminal attached; Copy Attach Command (shell-quoted) when you don't.
- **Drill into running processes.** From any session, jump to a per-pane view with PID, command, current working directory, and dimensions — grouped by window. Kill individual panes from there.

Everything works against any prefix key (default `Ctrl+b`, or remapped like `Ctrl+a`). The extension itself never assumes a prefix.

## Tmux Sessions — full inventory

### Per-row data
- Session name and current window name
- Attached indicator: green filled circle = an attached client exists, hollow grey circle = detached
- Window count badge (`3w`)
- Last activity timestamp (live-updating tooltip with full datetime)

### Top-level actions

| Action | Shortcut | What it does |
|--------|----------|--------------|
| Switch Client to Session | Enter | `tmux switch-client -t <name>` against the focused terminal client. Pre-checks `list-clients` so you get a clear toast if no client is attached. |
| Copy Attach Command | Cmd+C | Shell-quoted `tmux attach -t <name>` on the clipboard — for when you want to paste into a new terminal. |
| Rename Session | Cmd+R | Form with live validation: rejects names containing spaces, colons, or dots (tmux's real target-syntax constraints). |
| New Session | Cmd+N | Form with **native macOS folder picker** for the start directory. Created detached (`-d`) so you can decide how to enter it. |
| Show Panes & Processes | Cmd+B | Drill into every pane in the session (see below). |
| Kill Session | Ctrl+X | Destructive, gated by confirm alert. |
| Kill All Other Sessions | Ctrl+Shift+X | `tmux kill-session -a -t <keep>`. Useful end-of-week cleanup. |
| Refresh | Cmd+Shift+R | Force a re-list. |

### Panes & Processes view

Per-pane: command being run, current working directory, PID, dimensions (`80×40`), pane id (`%17`), active marker.
Grouped by window, sorted by pane index. Each pane is killable individually (with confirm).

## Supporting commands

### Tmux Cheatsheet

A searchable reference of stock tmux defaults — about **60 entries across 9 sections** (Core, Window, Pane, Session, Copy mode, Misc, Command mode, Resurrect, Files). Every entry has copy-to-clipboard actions for its shortcut, command-mode payload, or shell snippet, plus a detail view with markdown.

Highlights worth knowing about:
- **Pane** section covers split, zoom (`prefix z`), arrow navigation, resize (`prefix Ctrl+arrow`), `break-pane` (`prefix !`), layout cycling.
- **Command mode** has the long-tail commands people forget: `respawn-pane -k`, `move-window -s src:N -t dst:`, `swap-window -s X -t Y`, `find-window`, `display-panes`.
- **Resurrect** documents both the plugin's default key bindings (`prefix Ctrl+s` / `prefix Ctrl+r`) and the equivalent `run-shell` commands, so the extension's dedicated save/restore commands feel consistent with the plugin.

### Run Tmux Command

Form for arbitrary tmux input, the launcher equivalent of `prefix :`:

- Submit runs `tmux <input>` via `/bin/sh -c`, preserving shell quoting and variable expansion.
- Result rendered in a Detail view with separate stdout and stderr code blocks, each with copy actions.
- **10 quick presets** (`list-sessions`, `list-windows`, `list-clients`, `kill-session -a`, `show-options -g`, `clear-history`, mouse on/off, status on/off, `find-window`, `display-message '#{pane_current_path}'`).
- **Per-user history** — last 20 commands, persisted via `LocalStorage`, accessible via submenu, one-tap clear.

### Tmux Resurrect Save / Tmux Resurrect Restore

One-shot no-view commands wrapping `~/.tmux/plugins/tmux-resurrect/scripts/save.sh` and `restore.sh`. HUD on success, toast with the underlying stderr on failure (helpful if the plugin isn't installed at the expected path).

## Common workflows

**Switch into a project session.**
Raycast → "Tmux Sessions" → start typing the name → Enter. The focused terminal client is now in that session.

**Start a fresh session for a new project.**
"Tmux Sessions" → `Cmd+N` → type a name → click the folder picker → browse to the project directory in Finder → Create. Then `Enter` on the new row to Switch Client into it.

**Quick housekeeping.**
"Tmux Sessions" → find the survivor → `Ctrl+Shift+X` to nuke everything else around it.

**Audit what's actually running.**
"Tmux Sessions" → pick a session → `Cmd+B` (Show Panes & Processes). See every pane's command, PID, and cwd at a glance. Kill rogue panes individually.

**Send a one-off tmux command.**
Raycast → "Run Tmux Command" → type or pick a preset → see stdout/stderr inline. Recent commands are one keystroke away via the history submenu.

## Design highlights

- **Argument-safe.** All tmux calls use `execFile` with explicit positional args — no shell interpolation, no injection. The single intentional exception is "Run Tmux Command," which uses `/bin/sh -c` precisely to preserve `prefix :` quoting semantics.
- **Resilient to a missing tmux server.** `listSessions` recognizes the "no server running" stderr and returns an empty list with a "Create New Session" empty-state, rather than surfacing it as an error.
- **Robust delimiter.** Session and pane data are parsed using a `||SEP||` multi-character delimiter rather than tab. Tabs and single-byte control characters get normalized by the Raycast runtime layer, so a printable multi-char sequence is the only safe choice. Documented in `src/lib/tmux.ts`.
- **Reserved-shortcut compliant.** Cmd+P is left to Raycast's "Print" reservation; all extension shortcuts use other keys (Cmd+B for "Show Panes & Processes", Cmd+I for "Copy PID", etc.).
- **No personal preset leakage.** Every label, default, and example was scrubbed for general use. The cheatsheet covers only stock tmux defaults, not the author's `~/.zshrc` shortcuts.
- **English-only UI.** All user-facing strings are English. The cheatsheet was rewritten from the original bilingual draft for Store reach.

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

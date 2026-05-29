# Tmux Kit

The most complete tmux integration for Raycast — **full control over sessions, windows, AND panes** from the launcher, plus a searchable cheatsheet, an arbitrary-command runner, and tmux-resurrect save/restore. The whole `session → window → pane` hierarchy is reachable without ever opening a terminal first.

> Built for tmux power users, AI vibe-coders running Claude Code / Codex / Gemini in side-by-side panes, and anyone who has ever forgotten `prefix !` mid-flow.

**Keywords:** tmux, terminal multiplexer, session manager, window manager, pane manager, switch-client, attach, kill, rename, capture-pane, break-pane, swap-pane, mark-pane, new-window, kill-window, resurrect, cheatsheet, Claude Code, Codex, AI agents, vibe coding.

---

## Commands & capabilities

**5 commands, one launcher — the whole `session → window → pane` tree without opening a terminal:** 20+ session/window/pane actions, a searchable ~60-entry cheatsheet, an arbitrary-command runner, and tmux-resurrect save/restore.

| Command | What you get |
| --- | --- |
| **Tmux Sessions** | The hub. Sessions: switch / attach (copy command) / rename / new (native folder picker) / kill / kill-others. Drill in with `Cmd+B` for **windows** (new / rename / switch / break-pane / kill) and **panes**: view & copy content, copy PID / ID / command / path, mark, swap-with-marked, **directional Swap ← → ↑ ↓**, clear history, break to window, kill one / kill others. |
| **Tmux Cheatsheet** | Searchable reference of ~60 stock tmux defaults across 9 sections, copy-to-clipboard on every entry, works with any prefix key. |
| **Run Tmux Command** | The launcher equivalent of `prefix :` — send arbitrary tmux input with stdout / stderr, 10 quick presets, and per-user history. |
| **Tmux Resurrect Save / Restore** | One-shot snapshot and restore of your entire tmux layout via tmux-resurrect. |

---

## Table of contents

1. [Why Tmux Kit](#why-tmux-kit)
2. [What you can do — at a glance](#what-you-can-do--at-a-glance)
3. [Commands](#commands)
4. [Tmux Sessions — session-level actions](#tmux-sessions--session-level-actions)
5. [Window-level actions](#window-level-actions)
6. [Pane-level actions](#pane-level-actions)
7. [Step-by-step workflows](#step-by-step-workflows)
8. [Tmux Cheatsheet](#tmux-cheatsheet)
9. [Run Tmux Command](#run-tmux-command)
10. [Tmux Resurrect Save / Restore](#tmux-resurrect-save--restore)
11. [Design highlights](#design-highlights)
12. [Preferences](#preferences)
13. [Requirements](#requirements)
14. [Compatibility notes](#compatibility-notes)

---

## Why Tmux Kit

Most tmux launchers stop at "show me a list of sessions." Tmux Kit goes the whole way down the tree:

- **Sessions** — switch / attach / rename / new (with native folder picker) / kill / kill-others.
- **Windows** — new / rename / switch-to / break-pane-into / kill (the whole window, every pane inside).
- **Panes** — view content (capture-pane in a Detail view) / copy content / mark / swap-with-marked / directional swap (←→↑↓) / clear-history / break-to-new-window / kill (one) / kill-others-in-window.

Every layer of tmux's `session → window → pane` hierarchy is a first-class citizen of the launcher, with destructive actions consistently gated behind a confirm alert. Every tmux invocation is exercised end-to-end against a live `tmux 3.6` server during development, alongside TypeScript `--noEmit` checking in `ray build`.

**Designed with vibe coding in mind.** If your tmux looks like three panes each running a different AI assistant — Claude Code in one, Codex in another, a long-running build or test agent in a third — the actions you actually reach for are first-class, not afterthoughts:

- _Peek at what an agent just printed_ → **View Pane Content** opens a Detail view of `capture-pane` output, no attach required.
- _Kill the one that's stuck_ → **Kill Pane** (just one) or **Kill Other Panes in Window** (keep the working one, nuke the rest).
- _Swap two panes without attaching_ → **Mark Pane** on one, **Swap with Marked Pane** on the other — or just **Ctrl+Opt+Arrow** to swap a pane with an adjacent one in a single step.
- _Promote the build agent into its own window_ → **Break to New Window**.
- _Free up the layout and start fresh_ → **New Window in This Session** with an optional start directory.

---

## What you can do — at a glance

### Sessions
- [x] List all sessions with attached state, window count, current window, last activity
- [x] Switch the attached client into a session (one Enter)
- [x] Copy a shell-quoted `tmux attach` command for new terminals
- [x] Rename, with live validation against tmux's target-syntax rules
- [x] Create a new detached session via native macOS folder picker
- [x] Kill one session, or kill-all-others
- [x] Drill into the session's panes & windows (Cmd+B)

### Windows
- [x] Create a new window in the current session, with optional name + start directory
- [x] Rename a window (form pre-filled with current name)
- [x] Switch a session's current window via `select-window`
- [x] Break a pane into its own new window
- [x] Kill an entire window (and every pane inside it)

### Panes
- [x] View captured pane content in a Detail view, reloadable
- [x] Copy pane content to the clipboard
- [x] Copy pane PID, pane ID, command, or current working directory
- [x] Mark a pane (sets tmux's global marked-pane flag)
- [x] Swap a pane with the currently marked pane
- [x] Swap a pane with its adjacent pane in any direction (left / right / up / down)
- [x] Clear pane scrollback history
- [x] Kill a single pane
- [x] Kill all other panes in a window (keep the survivor)

---

## Commands

| # | Command | Mode | What it does |
|---|---------|------|--------------|
| 1 | **Tmux Sessions** | view | The main launcher — sessions, windows, panes in one view. |
| 2 | **Tmux Cheatsheet** | view | Searchable reference of ~60 stock tmux defaults across 9 sections. |
| 3 | **Run Tmux Command** | view | Send arbitrary tmux input (`prefix :` equivalent) with stdout / stderr inline. |
| 4 | **Tmux Resurrect Save** | no-view | Snapshot the current tmux layout via tmux-resurrect. |
| 5 | **Tmux Resurrect Restore** | no-view | Restore the last tmux-resurrect snapshot. |

---

## Tmux Sessions — session-level actions

### Per-row data
- Session name and current window name
- Attached indicator: green filled circle = an attached client exists, hollow grey circle = detached
- Window count badge (`3w`)
- Last activity timestamp (live-updating tooltip with full datetime)

### Action panel

| Action | Shortcut | What it does |
|--------|----------|--------------|
| Switch Client to Session | Enter | `tmux switch-client -t <name>` against the focused terminal client. Pre-checks `list-clients` so you get a clear toast if no client is attached. |
| Copy Attach Command | Cmd+C | Shell-quoted `tmux attach -t <name>` on the clipboard — for when you want to paste into a new terminal. |
| Rename Session | Cmd+R | Form with live validation: rejects names containing spaces, colons, or dots (tmux's real target-syntax constraints). |
| New Session | Cmd+N | Form with **native macOS folder picker** for the start directory. Created detached (`-d`) so you can decide how to enter it. |
| Show Panes & Processes | Cmd+B | Drill into every pane in the session, grouped by window. Full pane- and window-level actions available there (see below). |
| Kill Session | Ctrl+X | Destructive, gated by confirm alert. |
| Kill All Other Sessions | Ctrl+Shift+X | `tmux kill-session -a -t <keep>`. Useful end-of-week cleanup. |
| Refresh | Cmd+Shift+R | Force a re-list. |

---

## Window-level actions

Reachable from any pane in the Panes & Processes view (Cmd+B from a session). Each pane row carries the **full set of window actions for its parent window**, so you do not need a separate "windows" list.

| Action | Shortcut | What it does |
|--------|----------|--------------|
| Switch to Window | Cmd+Shift+W | `select-window -t session:idx` — make the pane's parent window the current window of the session. Takes effect on the next attach. |
| Rename Window | Cmd+Shift+R | Push form, pre-filled with the current window name. |
| New Window in This Session | Cmd+Shift+N | Push form with optional name (auto-named from the running command if blank) and optional start directory (native FilePicker). Created detached (`-d`) so the session's current window does not change underneath an attached client. |
| Break to New Window | Cmd+B | `break-pane -s` — promote the focused pane into its own new window. |
| Kill Window | Ctrl+W | Destructive, confirm — kills the parent window and **every** pane inside it. |

---

## Pane-level actions

Per-pane data shown in the list: command, current working directory, PID, dimensions (`80×40`), pane id (`%17`), active marker, and a purple **MARKED** accessory when tmux's marked-pane flag is set. Panes are grouped by window and sorted by pane index.

| Action | Shortcut | What it does |
|--------|----------|--------------|
| Copy Path | Enter | The pane's current working directory. |
| View Pane Content | Cmd+D | Pushes a Detail view rendering `capture-pane -p -J` output. `Cmd+R` reloads; trailing blank rows are trimmed. |
| Copy Pane Content | Cmd+Shift+C | Captures the visible pane content to the clipboard. |
| Copy PID | Cmd+I | Copy the pane's PID. |
| Copy Pane ID | Cmd+Shift+I | Copy the tmux pane id (e.g. `%17`). |
| Copy Command | – | Copy the command currently running in the pane. |
| Mark Pane / Unmark Pane | Cmd+M | Sets tmux's global marked-pane flag (`select-pane -m`) or clears it (`select-pane -M`). The marked pane gets a `MARKED` tag in the list. |
| Swap with Marked Pane | Cmd+Shift+S | `swap-pane -t` — shown only when a different pane is currently marked, so you cannot accidentally swap with the wrong source. |
| Swap Left / Right / Up / Down | Ctrl+Opt+← / → / ↑ / ↓ | `swap-pane -s <pane> -t <neighbor> -d` — swap the selected pane with its nearest neighbor in that direction (same window). Shown only when a neighbor exists in that direction; never changes the active pane. |
| Clear Pane History | Cmd+Shift+K | `clear-history -t` — release scrollback memory or hide error context. |
| Kill Pane | Ctrl+X | Destructive, confirm. |
| Kill Other Panes in Window | Ctrl+Shift+X | Destructive, confirm — keeps the focused pane, kills its window-siblings. |
| Refresh | Cmd+R | Re-list. |

Everything works against any prefix key (default `Ctrl+b`, or remapped like `Ctrl+a`). The extension itself never assumes a prefix.

---

## Step-by-step workflows

### 1. Switch into a project session
1. Open Raycast.
2. Type **Tmux Sessions**.
3. Start typing the session name.
4. Press **Enter** → the focused terminal client is now in that session.

### 2. Start a fresh session for a new project
1. Open **Tmux Sessions**.
2. Press **Cmd+N** (New Session).
3. Type a name.
4. Click the **folder picker chip** → browse to the project directory in macOS Finder → pick.
5. Submit. The session is created detached.
6. Press **Enter** on the new row to Switch Client into it.

### 3. Audit what is actually running across panes
1. **Tmux Sessions** → pick the session you care about.
2. Press **Cmd+B** (Show Panes & Processes).
3. Each pane row shows its command, CWD, PID, and dimensions. Filter with the search bar by command name, PID, or path.

### 4. Check on a running AI agent without attaching
1. **Tmux Sessions** → pick the project → **Cmd+B**.
2. Find the agent's pane.
3. Press **Cmd+D** (View Pane Content). What the agent printed renders in a Detail view.
4. Press **Cmd+C** to copy the captured content (e.g. paste into another assistant for analysis).
5. Press **Cmd+R** inside the Detail view to re-capture after the agent does more work.

### 5. Rearrange panes without attaching
1. On the **source** pane → press **Cmd+M** (Mark). The row gets a purple `MARKED` tag.
2. Navigate to the **destination** pane.
3. Press **Cmd+Shift+S** (Swap with Marked Pane). The layout swaps without ever leaving Raycast.

> **Faster for adjacent panes:** skip the mark step — on a pane, press **Ctrl+Opt+Arrow** (or use **Swap Left / Right / Up / Down**) to swap it with its neighbor in that direction in one step.

### 6. Promote a runaway pane into its own window
1. On the pane that is monopolizing screen real estate → press **Cmd+B** (Break to New Window).
2. The pane becomes window N+1 of the session; the original window keeps its other panes.

### 7. Kill a wedged agent, keep its siblings
1. Drill into the multi-agent window.
2. On the stuck pane → **Ctrl+X** (Kill Pane) → confirm.
3. Alternative: if only ONE agent matters and the rest can go, focus the survivor and press **Ctrl+Shift+X** (Kill Other Panes in Window).

### 8. Spin up a new window inside an existing session
1. **Tmux Sessions** → pick the session → **Cmd+B**.
2. On any pane row → **Cmd+Shift+N** (New Window in This Session).
3. Optionally type a window name (blank → auto-named from the running command).
4. Optionally pick a start directory via the folder picker.
5. Submit. Window is created detached, so it does not yank an attached client's focus.

### 9. Rename a window in place
1. From the Panes & Processes view → pick any pane in the target window.
2. Press **Cmd+Shift+R** (Rename Window). The form is pre-filled with the current name.
3. Edit and submit.

### 10. Kill an entire window (every pane inside)
1. From the Panes & Processes view → pick any pane in the target window.
2. Press **Ctrl+W** (Kill Window) → confirm.

### 11. End-of-week session cleanup
1. **Tmux Sessions** → find the one survivor you want to keep.
2. Press **Ctrl+Shift+X** (Kill All Other Sessions) → confirm.

### 12. Send a one-off tmux command
1. Open **Run Tmux Command**.
2. Type the command (or pick from the 10 quick presets, or recall from your history submenu).
3. Submit → stdout and stderr each render in their own code block, both with copy actions.

---

## Tmux Cheatsheet

A searchable reference of stock tmux defaults — about **60 entries across 9 sections** (Core, Window, Pane, Session, Copy mode, Misc, Command mode, Resurrect, Files). Every entry has copy-to-clipboard actions for its shortcut, command-mode payload, or shell snippet, plus a detail view with markdown.

Highlights worth knowing about:
- **Pane** section covers split, zoom (`prefix z`), arrow navigation, resize (`prefix Ctrl+arrow`), `break-pane` (`prefix !`), layout cycling.
- **Window** section covers create, next/prev, jump by index, find, rename, and move.
- **Command mode** has the long-tail commands people forget: `respawn-pane -k`, `move-window -s src:N -t dst:`, `swap-window -s X -t Y`, `find-window`, `display-panes`.
- **Resurrect** documents both the plugin's default key bindings (`prefix Ctrl+s` / `prefix Ctrl+r`) and the equivalent `run-shell` commands, so the extension's dedicated save/restore commands feel consistent with the plugin.

---

## Run Tmux Command

Form for arbitrary tmux input, the launcher equivalent of `prefix :`:

- Submit runs `tmux <input>` via `/bin/sh -c`, preserving shell quoting and variable expansion.
- Result rendered in a Detail view with separate stdout and stderr code blocks, each with copy actions.
- **10 quick presets** (`list-sessions`, `list-windows`, `list-clients`, `kill-session -a`, `show-options -g`, `clear-history`, mouse on/off, status on/off, `find-window`, `display-message '#{pane_current_path}'`).
- **Per-user history** — last 20 commands, persisted via `LocalStorage`, accessible via submenu, one-tap clear.

---

## Tmux Resurrect Save / Restore

One-shot no-view commands wrapping the resurrect plugin's `save.sh` and `restore.sh`. HUD on success, toast with the underlying stderr on failure. The scripts directory defaults to the tpm install location (`~/.tmux/plugins/tmux-resurrect/scripts`); override via the **Tmux Resurrect Scripts Directory** preference for Homebrew installs (e.g. `/opt/homebrew/share/tmux-resurrect/scripts`) or manual clones. The resolved path is shell-quoted before `tmux run-shell`, so directories with spaces work too.

---

## Design highlights

- **Smoke-tested against a live tmux server.** Every new tmux invocation (pane mark/swap, window rename, `capture-pane` trimming, `select-pane -m / -M`, `kill-pane -a`, `new-window -d`, etc.) is exercised end-to-end against a real `tmux 3.6` instance during development. Combined with the TypeScript `--noEmit` check baked into `ray build`, both shape and behaviour are verified before release.
- **Argument-safe.** All tmux calls use `execFile` with explicit positional args — no shell interpolation, no injection. The single intentional exception is "Run Tmux Command," which uses `/bin/sh -c` precisely to preserve `prefix :` quoting semantics.
- **Stable session targeting.** Sessions are targeted by tmux's internal `session_id` (`$N`), not by name, so a rename mid-flight does not break a pending switch/kill.
- **Resilient to a missing tmux server.** `listSessions` recognizes the "no server running" stderr and returns an empty list with a "Create New Session" empty-state, rather than surfacing it as an error.
- **Robust delimiter.** Session and pane data are parsed using a `||SEP||` multi-character delimiter rather than tab. Tabs and single-byte control characters get normalized by the Raycast runtime layer, so a printable multi-char sequence is the only safe choice. Documented in `src/lib/tmux.ts`.
- **Reserved-shortcut compliant.** Cmd+P is left to Raycast's "Print" reservation; all extension shortcuts use other keys (Cmd+B for "Show Panes & Processes", Cmd+I for "Copy PID", etc.).
- **No personal preset leakage.** Every label, default, and example was scrubbed for general use. The cheatsheet covers only stock tmux defaults, not the author's `~/.zshrc` shortcuts.
- **English-only UI.** All user-facing strings are English. The cheatsheet was rewritten from the original bilingual draft for Store reach.

---

## Preferences

| Name | Type | Default | Purpose |
|------|------|---------|---------|
| Tmux Binary Path | textfield | `/opt/homebrew/bin/tmux` | Path to the `tmux` binary. Intel Macs typically need `/usr/local/bin/tmux`. |
| Default Start Directory | textfield | _(empty → `$HOME`)_ | Pre-filled in the new-session folder picker. Use an absolute path. |
| Tmux Resurrect Scripts Directory | textfield | _(empty → `~/.tmux/plugins/tmux-resurrect/scripts`)_ | Override for users whose tmux-resurrect lives outside the tpm default — Homebrew install, custom `TMUX_PLUGIN_MANAGER_PATH`, or manual clone. Shell-quoted before `tmux run-shell`, so paths with spaces are safe. |

---

## Requirements

- macOS (the extension declares `platforms: ["macOS"]`).
- `tmux` installed and reachable at the configured path.
- For Resurrect Save / Restore: [tmux-resurrect](https://github.com/tmux-plugins/tmux-resurrect) installed somewhere — defaults to the tpm path `~/.tmux/plugins/tmux-resurrect/`, override via the Tmux Resurrect Scripts Directory preference for other layouts.

---

## Compatibility notes

- Works whether tmux is running on a separate client (Terminal.app, iTerm, Ghostty, WezTerm, Kitty, Alacritty, etc.) or not running at all.
- **Switch Client to Session** requires at least one attached terminal client (the extension itself is not a tmux client). If no client is attached, use **Copy Attach Command** instead.
- The cheatsheet's `vi`-mode copy entries assume `set -g mode-keys vi`. The shortcuts still document the standard tmux semantic and are equally useful as a learning reference.

---

## License

MIT.

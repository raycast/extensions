# Rex Sessions

Find your [Rex](https://www.superlogical.com/rex) sessions, tabs, and panes from Raycast, see what runs in each, and jump straight to them.

Rex is Superlogical's terminal multiplexer. It keeps every project in a **session** that stays alive on a server, with **tabs** that hold a layout of **panes** (terminals). The `rex` CLI calls tabs "windows" and panes "blocks"; this extension uses the words you see in the app.

## Commands

- **Search Panes** lists every terminal pane across all sessions and hosts in one list, with its title, the program and directory it runs in, and agent status. This is the fastest way to find the one Claude Code session that is waiting for you.
- **Search Tabs** lists tabs grouped by session. Each row shows the focused pane's title, the program running in it with its working directory, and the status of any coding agent reporting through Rex's Program Status Protocol (Claude Code, Amp, and others). A preview pane shows the terminal's current screen.
- **Search Sessions** lists sessions grouped by host, This Mac first, each with the device icon Rex uses (MacBook, Mac Studio, Mac mini, iMac, or the icon a remote host was added with), tab and pane counts, and a summary of agent activity. It drills into the tabs of one session.

Press Enter to jump: the tab and its focused pane get focus on the Rex server and the Rex app comes to the front. Use **Jump to Pane** (⌘J) in Search Tabs to pick a specific pane inside a tab. ⌘I toggles the terminal preview.

Sessions on remote hosts you added with `rex hosts add` appear alongside local ones, tagged with the host's label. Hosts that cannot be reached are listed at the bottom so the rest of the list never waits for them.

## Setup

Rex is currently in private beta; existing beta access is required.

1. Install your copy of Rex. The extension looks for `Rex.app` or `Rex Beta.app` in `/Applications` and `~/Applications`, and falls back to `rex` in `/opt/homebrew/bin` or `/usr/local/bin`. Set the **Rex CLI** preference if yours lives elsewhere; you can point it at the app bundle or at the `rex` binary.
2. Turn on **Remote Control** in Rex: open Rex → Settings → Rex Server → Remote Control. Without it, jumping still focuses the tab on the server, but the app cannot be told to switch to a different session.

## Preferences

| Preference | Default | What it does |
| --- | --- | --- |
| Rex CLI | auto-detect | Path to the `rex` binary or the Rex app bundle. |
| Bring Rex to the front | on | Activate the Rex app after focusing the chosen tab or pane. |
| Fallback Refresh | on | Rex's event stream updates the list instantly; this adds a slow 15 second poll in case the stream drops. |
| Tab Icons | 3 pills | How many pane pills to stack on a tab's icon. |
| Information | Normal | Normal shows every accessory, Reduced keeps status and program, Minimal shows only titles and pills. |
| Blocked, Done, Error | Dot (Rex) | A dot on the pill corner like Rex's tab bar, Rex's badge art, or nothing. |
| Progress | Pie (Rex) | Rex's progress pie inside the pill, a progress accessory on the row, both, or nothing. |
| Working | Animated dots (Rex) | Animated or static dots at the row's edge, animated dots on the pill, a spinner in the pill, or nothing. |

## How it works

The extension only talks to Rex servers through the `rex` command-line tool. For each host, one `rex do` call runs a short Lua script that walks every session, tab, and pane in a single connection, so a refresh takes a few tens of milliseconds even with dozens of terminals. Hosts are read in parallel. While a list is open the extension follows `rex events --all --json` for each host and refreshes only when Rex reports a change (a new tab, a title, a program, a status), so an idle Rex costs nothing. Previews come from `rex capture`, and jumping uses `rex focus` plus the app's `session.select` action.

Tabs and panes carry the same pills Rex draws in its tab bar: the glossy rounded card in the program's own colours and gradients with its glyph (Claude Code, Codex, Amp, Cursor, Node, Python, Docker, and about seventy more). A tab with several panes gets Rex's fanned stack, focused pane in front, up to the number set in the **Tab Icons** preference. Pills are painted by the extension itself from Rex's icon definitions and cached under Raycast's support folder, so new combinations cost a few milliseconds once. The program is picked from the agent reporting status or the foreground program, using Rex's own command aliases, so `python3.12` is Python and `kubectl` is Kubernetes. Program activity follows Rex's tab bar by default: a dot on the pill's corner when a pane is blocked, done, or in error, the glyph replaced by Rex's progress pie while a program reports progress, and three animated dots at the row's edge while it is busy. The row accessories show the state as a small colored circle with its text. The **Blocked, Done, Error**, **Progress**, and **Working** preferences switch each indicator to an alternative, and **Information** sets how much each row shows. The Session / Tab / Pane vocabulary follows the app too.

Nothing leaves your machine except the connections Rex itself makes to hosts you configured.

## Trying the status marks

`scripts/status-demo.sh`, run inside a Rex terminal, walks that pane through every program state (working with progress, blocked for permission, a question, and a password, done, error, idle) with a pause between them, so you can watch Rex's tab indicator and the extension's pills and badges react. `scripts/status-demo.sh -a claude-code` pretends to be Claude Code; `scripts/status-demo.sh done "Tests passed"` leaves a single state on.

## Troubleshooting

- **Rex Server Unreachable**: open Rex once so its server starts, then try again.
- **Jumping focuses the wrong session**: turn on Remote Control in Rex's settings (see Setup).
- **A remote host shows under Unreachable Hosts**: check it with `rex hosts check`; the extension gives remote hosts six seconds per refresh.
- **No agent status badges**: badges appear only for programs that report status through OSC 7501. Claude Code and Amp do this out of the box inside Rex.

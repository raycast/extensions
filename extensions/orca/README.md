# Orca

Raycast extension for the [Orca](https://orca.stably.ai) agent orchestrator.

> Unofficial and community-maintained. Not affiliated with, endorsed by or
> supported by Stably, the makers of Orca. The icon is Orca's own app icon,
> used to make the extension recognisable.

Its job is to answer one question fast: **which agent is stuck waiting on me?**

## Commands

### List All Agents

Agents that stopped for input lead the list in their own **Waiting for input**
section, longest wait first — the one blocked for 40 minutes sits above the one
blocked for two. Everything else stays grouped by project below. The list
re-reads Orca every 5 seconds while open, so a wait time never goes stale.

Each row carries its state (`waiting` / `working` / `done`), how long it has been
waiting, and — in the details pane (`⌘D`) — the task, the agent's last reply and
the raw terminal, plus what it is blocked on, e.g. `AskUserQuestion` or a `Bash`
command awaiting permission.

**Row titles.** Orca names a pane from its first prompt, but gives up on things
like a bare slash command and leaves the agent's own name behind — several panes
all reading `Claude Code`. When the title is one of those, the row shows the
prompt instead, with URLs cut down to their tail: `/review work_items/450 (leave
the automation…)` rather than `Claude Code`. Titles Orca did generate are left
alone.

Actions:

| Action | Shortcut |
| --- | --- |
| Switch to terminal in Orca (focuses the app) | `↵` |
| Show/hide details (last output + metadata) | `⌘D` |
| Copy terminal handle | `⌘C` |
| Copy worktree path | `⌘⇧C` |
| Show worktree in Finder | — |
| Refresh | `⌘R` |

### Orca Agents

A background command that keeps a live status in the root search, refreshed
every minute even while Raycast is closed.

What it writes depends on **Root Search Subtitle**. Set to *Blocked sessions*
— the default — it lists them inline and gives up detail only as the row runs
out of space:

```
❓ checkout: Fix the VAT rou… · ❓ api: refactor the pa…   project and session
❓ checkout: Fix the… · ❓ api: refactor…                  names trimmed to fit
❓ checkout · ❓ api                                       projects alone
❓ checkout +1                                             what fits, plus a count
```

The project is never dropped before the session name is: it is what tells two
panes in different checkouts apart.

Set to *Counts only* it reports the mix instead, `2 waiting · 1 working`. With
nobody blocked in either mode it falls back to the plain extension name rather
than leave a number behind — `null` would clear the subtitle outright, and the
row would stop matching a search for "orca".

This preference reaches only this command. **List All Agents** has its own
dropdown and is not affected by it.

Pressing `↵` opens **List All Agents** showing *all* agents regardless of the
preference, with the blocked ones on top: arriving from a count of who is
stuck, the useful view is the full picture, not a list filtered down to them.

Pin this command (`⌘K` → Pin Command) to keep it at the top of the root search
without typing.

It exists as a separate command out of necessity: only `no-view` and `menu-bar`
commands can run on an `interval`, and `updateCommandMetadata` writes only its
own command's subtitle. Folding it into **List All Agents** would mean a count
that freezes at whatever it was the last time the list was opened.

### Add Prompt

A builder: pick a project, an agent and whether to branch off a worktree, write
the prompt, give it a name — saved commands are all prefixed `Orca / `, so
typing "orca" in the root search turns up the extension and every saved prompt
together — and save it as a **Quicklink**, a named entry that
lives in the root search next to commands. Typing its name and pressing `↵`
starts the agent in Orca with that prompt.

An extension cannot add commands to itself at runtime — the manifest is fixed —
so the named entry is a Quicklink pointing at **Run Prompt** with the whole
spec carried in its deeplink. Raycast stores, lists and searches it; the
extension keeps no state of its own, and the entry is renamed or deleted in
Raycast's own Quicklinks manager.

The form ends with a live preview — what the command will be called, what gets
appended at launch and which agent runs where. It is three labelled lines
rather than one block: `Form.Description` collapses newlines into a paragraph.

The agent list is every agent Orca supports, not only the ones installed here:
Raycast hands extensions a trimmed `PATH`, so probing for installed binaries
would lie more often than it helped. Each agent carries its own icon and colour
from `src/agents.ts`, used in the dropdown, in the saved command's icon and in
**List All Agents**. They are built-in Raycast icons rather than vendor logos:
Raycast ships none, Orca bundles art for only two agents, and a Quicklink's
`icon` is typed as `Icon`, so a custom image cannot go there at all.

### Run Prompt

What a saved prompt points at. With a worktree it is one call —
`worktree create --repo id:… --name … --agent … --prompt …` — and Orca does the
rest.

Without one, **Run In** decides where the prompt lands. *A new agent* opens a
fresh pane in the project folder (`terminal create`, then `terminal send`),
leaving working agents alone. *The agent already running* sends it to the pane
of the project's most recently active agent instead — skipping panes that cannot
take input (detached, orphaned or read-only) and falling back to a fresh pane
when that project has none, so the prompt is never dropped.

**Orca is never brought to the front.** The agent starts in the background and
its pane is waiting whenever you get to it; Raycast just flashes a HUD.

**Adding text at launch.** If the saved command was built with *Add extra text
when run*, something is appended to the stored prompt after a blank line each
time it runs. Where that text comes from is chosen when saving:

| Source | Placeholder | Behaviour |
| --- | --- | --- |
| Ask, prefilled with clipboard | `{argument name="Extra" default="{clipboard}"}` | Inline field, clipboard pre-filled; clear it and nothing is appended |
| Ask, empty | `{argument name="Extra"}` | Inline field, starts empty |
| Clipboard | `{clipboard}` | Last copied text, no prompt |
| Selected text | `{selection}` | Selection in the frontmost app |
| Browser tab | `{browser-tab}` | The focused tab as Markdown; needs Raycast's browser extension |

Every placeholder is piped through `| json-stringify` so Raycast escapes the
value: quotes and newlines in the text cannot break the JSON the link carries.
And should Raycast hand a placeholder over unexpanded, the command resolves the
clipboard or selection itself, so the behaviour holds either way.

Started on its own it has no prompt to run, so it opens **Add Prompt** instead.

## Preferences

| Preference | Default | What it does |
| --- | --- | --- |
| Root Search Subtitle | Blocked Sessions | What **Orca Agents** writes under its name in the root search: the blocked sessions by project and name, or plain counts. Affects that command only. |
| Agent Types | All agents | Which panes count as agents in **List All Agents**: all, Claude only, Codex only, or every pane including plain shells. |
| Orca CLI Path | bundled binary | Where the `orca` executable lives. |

**List All Agents** takes no preference for which agents it shows. It opens on
all of them — the blocked ones lead the list anyway — and its dropdown narrows
the view to *Waiting for Input* or *Waiting & Finished* for that session.

## How state is detected

Two calls, run in parallel:

- `orca terminal list --limit 100 --json` — the live panes.
- `orca worktree ps --json` — what each agent is doing, as `agents[].state`.

They are joined on `paneKey`, which equals `tabId:leafId` from the terminal list.
`state` comes straight from Orca — no guessing from terminal output. `waiting`
means the agent asked something and is blocked on the answer; it was verified
against a live session sitting on `AskUserQuestion`.

## Requirements

Orca.app installed and running. The extension shells out to the CLI bundled with
the app at `/Applications/Orca.app/Contents/Resources/bin/orca`; override the
path in extension preferences if yours lives elsewhere.

## Development

```bash
npm install
npm run dev     # registers the extension in Raycast and hot-reloads
npm run build
npm run lint
npm test        # node --test over tests/, no runner to install
```

Tests cover the pure functions in `src/orca.ts` — the join, the filters, the
section order, the summary — against fixtures in `tests/fixtures/`, which are
real snapshots of a running Orca captured while an agent was blocked.

The icon is Orca's own app icon, taken from
`Orca.app/Contents/Resources/icon.icns`, the way other community extensions use
the icon of the app they drive.

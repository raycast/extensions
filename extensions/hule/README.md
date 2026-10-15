# Hule

Create, find and update [Hule](https://hule-do.com) tasks without leaving your keyboard.

## Commands

| Command | What it does |
|---------|--------------|
| **Quick Add Task** | Type one line, get a task in your default list. No window, no form. |
| **Create Task** | The full form: list, title, description, priority, due date, assignee. |
| **Search Tasks** | Search a workspace and act on any result. |
| **My Tasks** | Everything assigned to you, grouped into Overdue / Today / Tomorrow / Later. |

In both lists, `↵` opens the task's details without leaving Raycast, and the action panel
(`⌘K`) changes status (`⌥S`), priority (`⌥P`), due date (`⌥D`) and assignee (`⌥A`), opens
the task in Hule, copies its link, or deletes it.

## Setup

1. Open Hule → **Settings → API tokens** → **Create token**. Copy the `hule_pat_…` value —
   it is shown once.
2. Run any command from this extension and paste the token into **Personal API Token**.

Two optional preferences:

- **API URL** — only if you run a self-hosted Hule. Default: `https://api.hule-do.com/api`. It must
  use `https://` (plain `http://` only for `localhost`), because the token travels with every request.
  A self-hosted setup whose web app is not on the matching `app.` host will still work; only
  the "Open in Hule" links need correcting.
- **Default List** — the list **Quick Add Task** writes to. Write its name, or
  `Workspace / List` when several workspaces have a list with that name. Leave it empty and
  the first list you can add tasks to is used. A name that matches no list, or more than one, stops
  Quick Add with an error instead of writing somewhere else.

The token is stored in your macOS Keychain by Raycast and is sent only to the API URL above.
Everything you can reach through this extension is what your Hule account can reach — the
server's own permission and sharing rules decide, not the extension. To cut access off,
delete the token in **Settings → API tokens**; it stops working immediately.

## Credits

The priority glyphs in `assets/` are [Iconoir](https://iconoir.com) (MIT), the same
icon set the Hule app itself draws.

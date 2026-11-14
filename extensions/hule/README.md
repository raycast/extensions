# Hule

Create, find and update [Hule](https://hule-do.com) tasks without leaving your keyboard.

## Commands

| Command | What it does |
|---------|--------------|
| **Quick Add Task** | Type one line, get a task in your Quick capture list. No window, no form. |
| **Create Task** | The full form: list, title, description, priority, due date, assignee. Your Inbox lists come first in the list picker. |
| **Search Tasks** | Search a workspace and act on any result. |
| **My Tasks** | Everything assigned to you, grouped into Overdue / Today / Tomorrow / Later. |

In both lists, `↵` opens the task's details without leaving Raycast, and the action panel
(`⌘K`) changes status (`⌥S`), priority (`⌥P`), due date (`⌥D`) and assignee (`⌥A`), opens
the task in Hule, copies its link, or deletes it.

## Setup

1. Open Hule → **Settings → API tokens** → **Create token**. Copy the `hule_pat_…` value —
   it is shown once.
2. Run any command from this extension and paste the token into **Personal API Token**.

3. Optional: in Hule, open **Settings → Account** and choose a **Quick capture list** — the
   list for tasks you send from outside the app, the same one the Hule Telegram bot writes to.

**Quick Add Task** writes straight to your Quick capture list. Without one, it opens
**Create Task** with your title filled in and your Inbox lists — one per workspace, from Hule's
GTD settings — at the top of the list picker, so you pick the list for that one task.

One optional preference, **API URL** — only if you run a self-hosted Hule. Default:
`https://api.hule-do.com/api`. It must use `https://` (plain `http://` only for `localhost`),
because the token travels with every request. A self-hosted setup whose web app is not on the
matching `app.` host will still work; only the "Open in Hule" links need correcting.

The token is stored in your macOS Keychain by Raycast and is sent only to the API URL above.
Everything you can reach through this extension is what your Hule account can reach — the
server's own permission and sharing rules decide, not the extension. To cut access off,
delete the token in **Settings → API tokens**; it stops working immediately.

## Credits

The priority glyphs in `assets/` are [Iconoir](https://iconoir.com) (MIT), the same
icon set the Hule app itself draws.

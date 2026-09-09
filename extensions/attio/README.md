<p align="center">
    <img src="./media/attio@dark.png" width="150" height="150" />
</p>

# Attio

A **Raycast** extension for [Attio](https://attio.com/) — manage records, lists, notes, tasks, webhooks, and workspace members without leaving Raycast.

The extension reads the granted scopes on your access token and shows only the actions that token can actually perform. A read-only token sees no write actions anywhere — no "Edit Record," no "Create Task," no "Delete Webhook" — instead of failing when you click one.

## Getting Started

1. **Install extension**: Click the `Install Extension` button in the top right of [this page](https://www.raycast.com/xmok/attio) OR `install` via Raycast Store.
2. **Generate a token**: Follow [Generate an API key](https://attio.com/help/reference/apps/generating-an-api-key) in Attio's docs. When you create the key, Attio's scope picker lets you choose exactly which permissions to grant — see below for which ones this extension needs.
3. **Enter the token** in the extension's Preferences (`Access Token`).

## Required Scopes

Grant a **read-only** token and every command still works — it just shows no write actions. Add the opt-in scopes below only for the write actions you want.

> Tip: the scope picker lives in Attio under Workspace Settings → Developers → your access token.

### Required to read

| Scope                       | Needed by                                                                           |
| --------------------------- | ----------------------------------------------------------------------------------- |
| `object_configuration:read` | Objects, Records, schema/attribute lookups used everywhere                          |
| `record_permission:read`    | Records, Notes, Tasks                                                               |
| `list_configuration:read`   | Lists                                                                               |
| `note:read`                 | Notes                                                                               |
| `task:read`                 | Tasks                                                                               |
| `user_management:read`      | Members and Teams, **and Tasks** (task assignees resolve through workspace members) |
| `webhook:read`              | Webhooks                                                                            |

Two dependencies are easy to miss because the command name doesn't suggest them:

- **Tasks needs `user_management:read`** — task assignees are workspace members, so listing tasks requires the members scope even though you never open the Members command.
- **Notes needs `record_permission:read` and `object_configuration:read`** in addition to `note:read` — notes are attached to records, so resolving what a note is about requires record and object access too.

### Opt-in for writing

| Scope                             | Unlocks                                  |
| --------------------------------- | ---------------------------------------- |
| `record_permission:read-write`    | Editing and deleting records             |
| `note:read-write`                 | Editing notes                            |
| `task:read-write`                 | Creating, completing, and deleting tasks |
| `object_configuration:read-write` | Creating custom objects                  |
| `webhook:read-write`              | create, edit, and delete webhooks        |

If you grant only the "required to read" scopes above, the extension is fully read-only: every list and detail view works, and no write action appears in any action panel.

## Preferences

| Preference      | Description                                     |
| --------------- | ----------------------------------------------- |
| Access Token    | Your Attio API token (see above)                |
| Verbose Logging | Show detailed logs in the console for debugging |

## Commands

- **Search People / Search Companies / Search Deals** — browse, search, sort, filter, pin, edit, and export the standard objects; related records open in their home command
- **Search Tasks** — browse, filter, sort, group by due date, create, edit, complete, and delete tasks
- **My Tasks** — tasks assigned to you
- **Search Notes** — browse and edit notes with markdown rendering and parent-record context
- **Search Lists** — browse workspace lists and open them in Attio
- **Objects** — browse every object (including custom objects) and their records
- **Members and Teams** — browse workspace members
- **Manage Webhooks** — configure webhooks and webhook events (create, edit, delete; event-type picker)

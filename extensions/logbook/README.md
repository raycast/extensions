# Logbook for Raycast

Add tasks and tick them off without leaving Raycast.

## Commands

| Command | Mode | What it does |
| --- | --- | --- |
| **Add Task** | no-view | Type the task as an argument and press Enter. Nothing opens — a HUD confirms and you're back to what you were doing. |
| **Search Tasks** | view | Browse and search the logbook, filter by pending / completed / all, mark tasks complete, and delete them. Typing something that doesn't exist offers to create it. |

## Connecting

The first time you run a command, Raycast shows **Sign in with Logbook**. That
opens `/raycast/authorize` in your browser, where you approve the connection
with the Logbook account you're already signed into. Raycast stores the
resulting token in the macOS Keychain.

The token is a session that lives until it's revoked — Raycast won't ask you to
sign in again because a week went by. To disconnect, use **Log out** in the
extension's Raycast preferences, or revoke the `Logbook for Raycast` session
from the Logbook web app.

Signing out of the web app does **not** disconnect Raycast, and disconnecting
Raycast does **not** sign you out of the web app. They're separate sessions.

## Running it locally

This extension is deliberately outside the pnpm workspace — the `ray` CLI wants
its own dependency tree.

```bash
cd apps/raycast
npm install
npm run dev     # ray develop — installs into Raycast and hot-reloads
```

To point at a local backend, set the **Web URL** and **API URL** preferences to
`http://localhost:3000` and `http://localhost:3001` in the extension's Raycast
preferences.

## Publishing

`author` in `package.json` must be your Raycast username, otherwise `ray lint`
rejects the manifest. Store submission is `npm run publish`, which opens a PR
against `raycast/extensions`. Friends can skip all of that and just run
`npm run dev` from a clone.

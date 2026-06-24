# Jovida Daily for Raycast

Capture and manage your [Jovida Daily](https://jovida.ai) todos from Raycast — and let **Raycast AI** do it for you.

## Features

- **AI Extension** — Raycast AI can list, create, update, complete, and delete your todos in natural language ("add a todo to review the BP by Friday 6pm", "what's on my plate today", "mark the BP todo done"). Deletes require confirmation.
- **My Todos** — a List view to browse/search, complete/reopen, edit, and delete. Scope filter (Today / Upcoming / All).
- **Add Todo** — a quick form: title, due date (all-day or precise deadline), priority, category, subtasks, description.
- **Today's Todos** — a menu-bar item showing today's pending count; click an item to complete it.

## How it works

The extension drives the official [`@fluxvita/jovida-cli`](https://www.npmjs.com/package/@fluxvita/jovida-cli),
running it with Raycast's bundled Node. No separate install is required:

1. A copy of the CLI is **vendored into `assets/`** (offline baseline).
2. On launch the extension **auto-updates** to the latest npm release into its support
   directory and prefers that copy. Throttled (default every 24h); toggle in preferences.
3. You can also point at a custom `jovida` binary via the **Jovida CLI Path** preference.

Auth uses Jovida's device flow — the first command opens a browser approval page; the
token is stored by the CLI in `~/.jovida` (the extension never overrides `JOVIDA_HOME`).

## Development

```bash
npm install        # also vendors the CLI into assets/ (postinstall)
npm run dev        # load into Raycast (Raycast must be running)
npm run lint
npm run build
npm run vendor     # re-vendor the CLI after bumping the dependency
```

## Preferences

| Name | Description |
|------|-------------|
| Jovida CLI Path | Optional. Absolute path to a `jovida` binary or `cli.js` to use instead of the bundled/auto-updated CLI. |
| Auto-update CLI | Keep the bundled CLI updated to the latest npm release (default on). |
| Update Check Interval (hours) | How often to check npm for a newer CLI (default 24). |

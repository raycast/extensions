# Jovida Daily for Raycast

Capture and manage your [Jovida Daily](https://jovida.ai) todos from Raycast — and let **Raycast AI** do it for you.

## Features

- **AI Extension** — Raycast AI can list, view, create, update, complete, delete, and manage subtasks in natural language ("add a todo to review the BP by Friday 6pm", "what's on my plate today", "mark the BP todo done"). Deletes require confirmation. Recurring routines have their own tool, kept separate from one-off todos.
- **My Todos** — a List view to browse/search, complete (with inline Undo) / reopen, edit, and delete, with safe handling for repeating series. Time grouping (Overdue / Today / Tomorrow / Later / Anytime) and a Pending/All filter.
- **Add Todo** — a quick form: title, due date (all-day or precise deadline), priority, category, subtasks, reminders, phone-call reminder channel, and description. Optional AI assist turns a plain-language note into those fields.
- **Menu Bar Todos** — a menu-bar item listing upcoming pending todos; click to complete, ⌥-click to edit. Refreshes every 10 minutes.

## How it works

The extension talks to the Jovida backend **directly, in-process** — there is no CLI to install and no binary is spawned.

The pure client logic (HTTP client, device-flow auth, snapshot sync, and the domain conversion/recurrence helpers) is **vendored from the official [`@fluxvita/jovida-cli`](https://www.npmjs.com/package/@fluxvita/jovida-cli)** (MIT, © FluxVita) into `src/vendor/jovida/`. It is vendored rather than installed at runtime so the extension is self-contained and reviewable.

The CLI's file-based storage and machine-id modules are intentionally **not** vendored. This extension supplies store-clean replacements backed by Raycast `LocalStorage`: the auth token, sync version, and a random device id all live in `LocalStorage`, so nothing is written to `~/.jovida` or anywhere else on disk.

Auth uses Jovida's device flow. The first action that needs the backend opens a browser approval page; once approved, the token is stored in Raycast `LocalStorage` and reused. The UI renders immediately and only triggers sign-in on the first authenticated call, then retries.

See [`src/vendor/README.md`](src/vendor/README.md) for what is and isn't vendored.

## Development

```bash
npm install        # install dependencies
npm run dev        # load into Raycast (Raycast must be running)
npm run lint       # ray lint
npm run fix-lint   # ray lint --fix
npm run build      # ray build
```

`src/vendor/jovida/` is maintained by hand — after bumping the upstream
`@fluxvita/jovida-cli` version, re-copy the changed client modules into that
directory (the storage/machine-id replacements stay as they are).

This extension has no user preferences.

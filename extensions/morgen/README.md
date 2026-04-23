# Morgen for Raycast

Create tasks in [Morgen](https://www.morgen.so) without leaving Raycast.

## Commands

- **Create Task** — a form with title, description, due date, and priority. Every task lands in your Morgen **Inbox**.

## Setup

1. Install this extension in Raycast.
2. Get a Morgen API key from [platform.morgen.so/developers-api](https://platform.morgen.so/developers-api).
3. When you first run **Create Task**, Raycast prompts for the API key and stores it securely. Change it later under `Raycast → Extensions → Morgen`.

## Why Inbox-only?

Morgen's public API does not currently expose task lists. Specifically:

- There is no `/task-lists/list` endpoint to enumerate native Morgen task lists or their names ([feedback request](https://feedback.morgen.so/p/task-list-crud-endpoints-in-the-api-create-rename-delete)).
- `/tasks/list` only returns `taskListId` strings; some are opaque UUIDs belonging to third-party integrations (Todoist, Google Tasks, etc.) that `/tasks/create` won't accept as write targets.
- Omitting `taskListId` on create reliably puts the task in the Inbox, which is the only destination the API guarantees.

Rather than ship a dropdown populated with opaque IDs — some of which would 400 on submit — this extension sends every task to the Inbox until Morgen ships a first-class task-lists endpoint.

## Development

```bash
npm install
npm run dev
```

`npm run dev` runs `ray develop`, which hot-reloads the command inside Raycast. Lint with `npm run lint` and auto-fix with `npm run fix-lint`.

## Project structure

```
morgen-raycast-plugin/
├─ assets/
│  └─ command-icon.png
├─ src/
│  ├─ create-task.tsx        # Create Task command (Form)
│  └─ lib/
│     ├─ api.ts              # fetch wrapper + createTask
│     └─ types.ts            # CreateTaskInput
├─ eslint.config.js
├─ package.json
├─ tsconfig.json
└─ README.md
```

## License

MIT

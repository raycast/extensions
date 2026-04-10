# Niteshift for Raycast

A Raycast extension for the [Niteshift](https://niteshift.dev) background-agent platform. Run, monitor, and prompt agent tasks from anywhere with a keystroke.

> **Status:** v1, ready for coworker sideload. Public Raycast Store submission pending — see [Publishing](#publishing) below.

## Prerequisites

- macOS with [Raycast](https://raycast.com) 1.83+
- The [Niteshift CLI](https://www.npmjs.com/package/niteshift): `npm install -g niteshift`
- For the developer install path: Node.js 22.14+ and `git`

## Installation

There are three ways to install the extension. Pick the one that matches your situation.

### Option A — Sideload a pre-built bundle (no Node required)

The fastest path for non-technical coworkers and customers. You need a `dist/` folder built by someone with the source.

1. Get the `dist/` folder (download a zip or clone the repo and run `npm run build`).
2. In Raycast, run **Import Extension** and select the unzipped `dist/` folder.
3. Authenticate the CLI in your terminal (one time):
   ```bash
   niteshift auth
   ```
4. Use the commands. They keep working after you close any terminals — there's nothing to leave running in the background.

To update later, replace the `dist/` folder and re-import.

### Option B — Developer install (live reload)

Best if you want to edit the code or contribute fixes.

1. Clone the repo:
   ```bash
   git clone https://github.com/niteshiftdev/niteshift-raycast.git ~/code/niteshift-raycast
   cd ~/code/niteshift-raycast
   npm install
   ```
2. In Raycast, run **Import Extension** and select the `~/code/niteshift-raycast` folder.
3. Start the dev server **and keep it running**:
   ```bash
   npm run dev
   ```
   Raycast picks up source changes automatically while `npm run dev` is alive. **If you stop it, the commands stop working** — Raycast will say "Could not find command's executable JS file." Restart `npm run dev` or build the dist bundle (Option A).
4. Authenticate the CLI:
   ```bash
   niteshift auth
   ```

### Option C — Public Raycast Store (coming soon)

Once the extension lands in the [Raycast Store](https://www.raycast.com/store), you'll be able to install with one click from inside Raycast: search for "Niteshift" in the **Store** command, click Install, done. Auto-updates handled by Raycast.

This path is not live yet. See [Publishing](#publishing) for the submission status.

## Commands

| Command | What it does |
|---|---|
| **Run Task** | One-shot, no-view task creation. The prompt is a required Raycast argument — type `Run Task fix the login bug` from root search and press Enter. No form, no configuration page. The task is created against your default repo and model, and the task page opens in your browser. **Defaults:** the first time you run it, the extension picks the first repo alphabetically and `claude-opus-4-6`. Both values are persisted to `LocalStorage` and reused on subsequent runs. There's no in-extension UI to change them in v1 (planned for v1.1) — for now, the defaults are fixed once seeded, and the rich repo/model selection still lives behind the more configurable Niteshift web UI for the rare times you need a different combination. |
| **List Tasks** | Searchable list of recent tasks across your repos. Open the action menu (`⌘K`) on any task to **Watch Stream**, **Send Follow-up Prompt** (`⌘⇧F`), **Copy Pickup Command**, copy the URL/ID, or refresh. |

### Action menu (⌘K) on a task

Once you're on a task in **List Tasks**, press `⌘K` to see all available actions:

- **Open in Browser** (`⏎`) — opens the task page in the Niteshift web UI.
- **Watch Stream** — pushes a Detail view that backfills the task's messages and follows new ones live via SSE.
- **Send Follow-up Prompt** (`⌘P`) — pushes a form for typing a follow-up prompt to the task.
- **Copy Task URL** (`⌘C`) and **Copy Task Id** (`⌘⇧C`).
- **Copy Pickup Command** (`⌘⇧P`) — only shown for tasks the niteshift CLI can pick up locally (suspended/running tasks with a synced session). Copies `niteshift pickup <id>` (or the env-prefixed variant) to the clipboard so you can paste it in a terminal. There's also a **Copy Pickup --resume Command** sibling for resuming inside the agent.
- **Refresh** (`⌘R`) — re-fetches the task list.

The list also archives-out: archived tasks are excluded from the API call (and from a defensive client-side filter), so the view only shows active work.

## Environment switching

The extension defaults to **Production**. To use staging or dev:

1. Authenticate against that environment from the terminal first:
   ```bash
   niteshift --env staging auth
   niteshift --env dev auth
   ```
2. In Raycast, open the extension's preferences (`⌘ ⇧ ,`) and switch the **Environment** dropdown.

If the env preference doesn't match an env you've authenticated against, the extension will show a "CLI Auth Required" view with the exact command to run.

## Limitations

- **No file attachments** in Send Follow-up Prompt (v1 — see future work below).
- **No menu bar command** (v1).
- **Pickup is a discovery surface, not a local executor** — the action copies the right `niteshift pickup` command for you to paste in a terminal; the CLI does the actual local checkout.
- **Requires the CLI** for authentication. There is no in-Raycast device-code or OAuth flow yet.

## Building the dist bundle (for distribution)

```bash
npm install
npm run build
```

That writes a self-contained, importable extension to `./dist/`. Zip it and share with coworkers who don't want to deal with Node and `npm run dev`.

```bash
cd dist && zip -r ../niteshift-raycast-dist.zip . && cd ..
```

## Publishing

### Status

- **Coworker / customer sideload** — ready. Build the `dist/` bundle and share it.
- **Public Raycast Store** — almost ready. Two things still need a human:
  1. Register a Raycast.com profile that matches the `package.json` author field. The current `author: "joshlebed"` returns 404 from `https://www.raycast.com/api/v1/users/joshlebed`. Sign in at [raycast.com](https://www.raycast.com) and pick that username (or update `package.json` to whatever username you choose).
  2. Take 3-6 screenshots of the extension running in Raycast and drop them in `metadata/` per the convention there. Use Raycast's **Window Capture** with the extension running locally to get the required 2000×1250 size.

After both of those, run `npm run publish`. That command opens a guided flow that:

- Forks `raycast/extensions` to your GitHub account
- Drops the extension into `extensions/niteshift/` in that fork
- Opens a PR
- The Raycast team reviews; on merge it's live in the Store

### Lint check before submitting

The Store submission CI runs `npm run lint`. Make sure it's clean:

```bash
npm run lint
```

The only currently-blocking lint error is the author 404 above. Fix that and the extension is Store-ready.

## Manual test plan

After any non-trivial change, run through this:

1. `npm install && npm run dev` (or import a fresh `dist/` build)
2. With CLI authed against prod: open **List Tasks** → see real tasks (no archived tasks should appear)
3. Switch env preference to an unauthed env: **List Tasks** shows the AuthGate view; copy command works
4. Switch back. **Run Task** with prefilled argument (`Run Task fix the bug`) → form opens with prompt populated and the most-recently-used (or first alphabetical) repo selected
5. Submit a task end-to-end → browser opens task URL
6. In **List Tasks**, select a task → `⌘K` → **Watch Stream** → push detail view → messages stream → pop the view → no leaked SSE connection (`lsof -i | grep niteshift`)
7. Same task → `⌘K` → **Send Follow-up Prompt** (`⌘P`) → submit a prompt → it appears in the web UI
8. UI-created task with sessionSync → `⌘K` → **Copy Pickup Command** → paste in terminal → real pickup runs
9. Type `running` (or any status name) into the search bar → only matching tasks show

## Troubleshooting

- **"Could not find command's executable JS file. You might need to rebuild the extension."** — You're on Option B (dev install) and `npm run dev` isn't running. Restart it, OR switch to Option A by importing a built `dist/` folder.
- **"Niteshift CLI Auth Required" but I'm authed:** check the **Environment** preference matches what you authed against. Each env has its own auth file.
- **Watch Stream never streams new events:** the SSE connection may not work in your Raycast Node runtime — see `docs/superpowers/specs/2026-04-08-niteshift-raycast-design.md` §14.2 for the polling fallback.
- **List Tasks is empty:** verify with `niteshift list` in a linked repo. Note that archived tasks are filtered out by default.

## Future work

- Menu bar command with running task count
- File attachments in Send Prompt
- Real OAuth via `@raycast/utils` (so non-CLI users can install from the Store without first running `niteshift auth`)
- Shared `@niteshift/api-client` package consumed by both CLI and extension
- Raycast AI extension tools (`@niteshift create_task` etc.)

## Contributing

This is a personal/team extension during v1; improvements are welcome but expect breaking changes between versions until v1.0.

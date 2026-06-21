# Rituals

A Raycast extension to define **rituals** (work, focus, a specific project…) that
open your apps, websites and files, run shell commands, and tear everything back
down again — all with one keystroke.

Think of it as a launcher for your *whole context*: activate **Work** and it opens
VS Code, your repos, your browser, starts Docker and waits until it's ready before
bringing up your containers. Deactivate it and the containers stop and the apps quit.

## Features

- **One ritual, everything at once** — apps, websites, files/folders and shell commands.
- **Clean teardown** — deactivating runs each command's *stop* (the opposite command),
  then quits the apps the ritual opened.
- **Readiness waits** — hold a command until a check passes (e.g. wait for `docker info`
  before `docker start …`), so dependent steps never fire too early.
- **Browser control** — open a ritual's URLs in a specific browser, and for Chromium
  browsers (Chrome/Brave/Edge) a specific **browser profile/workspace**.
- **Fast mode** — open apps and URLs in parallel (commands always stay ordered).
- **Installed-app picker** — search your installed apps (with real icons); URLs show favicons.
- **Quick Open** — search and launch a single item from any ritual.
- **Import / export** — share or back up rituals as JSON.
- **AI-friendly** — generate a ready-to-import ritual from a plain-language description
  (see [Create rituals with AI](#create-rituals-with-ai)).

## Commands

| Command | What it does |
| --- | --- |
| **Activate Ritual** | Pick a ritual and run (or deactivate) all its actions. |
| **Manage Rituals** | Create, edit, delete. Import/export rituals as JSON. |
| **Quick Open Item** | Search every app/URL/file/command across rituals and open just one. |
| **Create Ritual with AI** | Describe a setup in plain language; AI generates and imports a ritual (needs Raycast Pro). |

## How a ritual runs

**Activate:** open apps → open URLs → open files → for each command, wait for its
readiness check (if any), then run it. With *Fast mode* the open steps run in parallel.

**Deactivate:** for each command in reverse, wait for its stop-readiness check (if any),
then run its *stop* command → finally quit every app the ritual opened.

A failing step never stops the rest; failures are reported in the final toast/HUD.
Commands run through your login shell, so your `PATH` (Homebrew, Docker, etc.) is loaded.

## Editing a ritual

The builder is a List with one section per action type:

- Add from a **searchable library** or type your own.
- **Reorder** with ⌘↑ / ⌘↓, remove with ⌃X.
- A **command** is configured in one place: *Run*, optional *Wait until ready*,
  optional *Stop on deactivate*, optional *Wait before stop*.
- **Settings** (⌘,): browser, browser profile, Fast mode, delay between commands.

Changes are saved automatically.

## Create rituals with AI

You don't have to build rituals by hand.

**Easiest — built in:** run **Create Ritual with AI**, describe your setup, and it
generates and imports the ritual for you (requires Raycast Pro for AI access).

**Any assistant:** the repo also ships the same prompt as a portable AI skill at
[`skills/create-workspace-profile.md`](skills/create-workspace-profile.md):

1. Give the skill file to any assistant (ChatGPT, Claude…).
2. Describe your setup: *"Work mode: open VS Code and Slack, my repos in Chrome, start
   Docker and bring up postgres once it's ready; stop it when I'm done."*
3. The assistant returns a JSON array.
4. In **Manage Rituals → Import Rituals** (⌘⇧I), paste it, choose **Merge**, **Import**.

The skill documents the full schema (apps, urls, paths, commands with
`run`/`waitFor`/`stop`/`stopWaitFor`, browser, fastMode, …) and the rules the model
must follow, so its output always imports cleanly.

## Development

```sh
npm install
npm run dev      # run in Raycast with hot reload
npm run build    # type-check + build
npm run lint     # lint
```

If you fork and publish your own copy, set `author` in `package.json` to your Raycast username.

## License

MIT

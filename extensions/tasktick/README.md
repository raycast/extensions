# TaskTick for Raycast

Search, run, and monitor your [TaskTick](https://www.lifedever.com/TaskTick/) scheduled tasks from Raycast — never leave your keyboard to babysit a cron job again.

## Features

- **Instant search** across every TaskTick scheduled task by name
- **One-keystroke control** — Run, Stop, Restart, and Reveal in TaskTick.app
- **Live status badges** that update in real time via TaskTick's events stream
- **Last-output preview** in plain text or pretty-printed JSON, right inside Raycast
- **Zero config for most users** — auto-detects the `tasktick` CLI from common install paths

## Requirements

- macOS 14 or later
- [TaskTick.app](https://www.lifedever.com/TaskTick/) 1.9.2 or later installed
- The `tasktick` CLI symlink enabled in **TaskTick → Settings → Advanced → Enable CLI**
  - Default symlink target: `/usr/local/bin/tasktick`
  - The extension also probes `~/.local/bin`, `/opt/homebrew/bin`, and the app's embedded binary as fallbacks

## Install (Development)

The extension is not yet published to the Raycast Store. To run it locally:

```bash
git clone https://github.com/lifedever/tasktick-raycast.git
cd tasktick-raycast
npm install
npm run dev
```

Raycast will pick up the extension automatically while `npm run dev` is running. Press `⌘ + Space`, type "Search Tasks", and you're in.

## Usage

### Search Tasks

The single entry point. Lists every TaskTick task with its current status, next run time, and a "last run" relative timestamp.

| Action            | Shortcut       | What it does                                                       |
| ----------------- | -------------- | ------------------------------------------------------------------ |
| Run               | `↵`            | Triggers the task immediately via `tasktick run <id>`              |
| Stop              | `↵` (running)  | Cancels an in-flight run via `tasktick stop <id>`                  |
| Restart           | `⌘ R`          | Stops then re-runs in one shot                                     |
| Reveal in TaskTick| `⌘ O`          | Brings TaskTick.app forward and selects the task                   |
| View Last Output  | `⌘ L`          | Pushes a detail view with the task's last stdout/stderr            |
| Copy ID           | `⌘ C`          | Copies the task's UUID to the clipboard                            |
| Refresh           | `⌘ ⇧ R`        | Force-refetches the task list                                      |

Status badges (`idle`, `running`, `failed`, etc.) update live as you watch — no need to refresh manually.

## Preferences

Open Raycast Preferences → Extensions → TaskTick to tune any of these.

| Preference            | Default      | Description                                                                                                          |
| --------------------- | ------------ | -------------------------------------------------------------------------------------------------------------------- |
| `CLI Path`            | _(empty)_    | Manual override for the `tasktick` binary. Leave blank to auto-detect. Point this at `/Applications/TaskTick Dev.app/Contents/MacOS/tasktick-dev` to drive the dev build. |
| `Show in-Raycast Toast` | `on`       | Display Raycast toasts for Run / Stop / Restart feedback. Disable if you prefer a quieter UI.                        |
| `Logs Display`        | `Plain text` | How "View Last Output" renders captured logs. Switch to `JSON` if your scripts emit structured output.               |

## Troubleshooting

### "TaskTick CLI not found"

The extension shows a setup screen with two paths forward:

1. **Recommended** — Open TaskTick.app → Settings → Advanced → toggle **Enable CLI**. This creates a symlink at `/usr/local/bin/tasktick` (you may be prompted for admin password the first time).
2. **Manual override** — Open Raycast Preferences → Extensions → TaskTick → set **CLI Path** to your binary location. Useful when:
   - You moved TaskTick.app to a non-standard location
   - You're running the dev build (`/Applications/TaskTick Dev.app/Contents/MacOS/tasktick-dev`)
   - Your shell PATH layout doesn't match the default probe list

### "tasktick run" succeeds but my task script doesn't actually execute

TaskTick.app needs to be running for scheduled-task execution. The CLI talks to the running app via XPC; if the app isn't open, commands are accepted but tasks won't actually fire. Launch TaskTick.app (it can sit happily in the menu bar) and try again.

### Status doesn't update in real time

The events stream uses `tasktick events --json` as a long-lived subprocess. If you see stale statuses:

1. Press `⌘ ⇧ R` to force-refresh
2. Make sure your `tasktick` CLI version supports the `events` subcommand (TaskTick.app 1.9.2+)
3. Check Raycast's developer console (`⌘ ⇧ D` while the extension is active) for stream errors

## Links

- **TaskTick homepage** — <https://www.lifedever.com/TaskTick/>
- **TaskTick app source** — <https://github.com/lifedever/TaskTick-app>
- **This extension** — <https://github.com/lifedever/tasktick-raycast>

## License

MIT — see [LICENSE](./LICENSE) (or treat as MIT until added).

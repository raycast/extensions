# Drone Builds

A Raycast extension for [Drone CI](https://www.drone.io/). Browse, restart and cancel your builds, drill into pipeline stages and step logs, trigger cron jobs, and get native macOS notifications when builds finish — without leaving Raycast.

> This is an unofficial, community-maintained extension and is **not affiliated with, endorsed by, or supported by Drone CI or Harness**. "Drone" and the Drone logo are trademarks of their respective owners.

## Commands

| Command | Mode | What it does |
|---|---|---|
| **Drone Builds** | view | List of your recent builds with detail pane (status, branch, author, duration, link). Enter pushes a stages/steps view; Enter on a step opens the log tail. Actions: Open in Browser (⌘O), Restart (⌘R), Cancel (⌃X), Copy URL (⇧⌘C). |
| **Drone Build Notifier** | no-view | Background poller that runs every minute and fires macOS notifications when your builds transition to a terminal status. Can also be invoked manually from the palette. |
| **Restart My Last Failed Build** | no-view | Finds your most recent failed / errored / killed build and restarts it. |
| **Cancel My Latest Running Build** | no-view | Finds your most recent running build, asks confirm, cancels. |
| **Open Drone Server** | no-view | Opens the configured Drone URL in the default browser. |
| **Run Drone Cron Job** | view | Pick a repo, pick one of its cron jobs, trigger it (`POST /api/repos/{slug}/cron/{name}`). |

## Notifications

Fired on background ticks when:

- **Build reaches a terminal status** (success / failure / error / killed) — sound varies by outcome.
- **Failure streak ≥ 3 in a row** on the same repo → title prefixed with `🔥 N in a row · …`.
- **Build still running** past the configurable threshold (default 15 min) — one-shot banner per build, cleared when the build finishes.

If `terminal-notifier` is installed (`brew install terminal-notifier`), banners are clickable (they open the build page) and group per build id. Otherwise the extension falls back to `osascript` (still a real Notification Center banner, but unclickable and shown as "Script Editor").

## Preferences

- **Drone Server URL** — e.g. `https://drone.example.com`.
- **Personal API Token** — Drone web UI → your avatar → User Settings → Personal Token.
- **Notify About** — `Only my builds` (matches on sender / author_login / author_email) or `All builds I can see`.
- **Notifier** — checkbox: prefer terminal-notifier when available.
- **Include Repos** — comma-separated `owner/repo` slugs to allow; empty = all.
- **Exclude Repos** — comma-separated `owner/repo` slugs to skip; always wins over include.
- **Demo Mode** — deterministically redacts slugs, authors, branches, commit messages and cron names in the UI. Use for screenshots or demos; toggle off for normal use.
- **Long-Running Alert** — minutes before a "still running" banner fires; `0` disables.

## How "new build" is detected

State lives in Raycast's `Cache` under namespace `drone-build-notifier`:

- **`seen-builds`** — `Record<buildId, BuildStatus>`, bounded to 500 entries. Drives terminal-state transition detection.
- **`long-running-notified`** — `number[]` of build ids that already received the "still running" banner; bounded to 200. Entries are freed when their build leaves `running`.

Each tick:

1. Fetch `/api/user/builds` once.
2. Filter: `mine` (sender / author_login / author_email) → repo include → repo exclude.
3. Diff against `seen-builds` — transitions to terminal status produce notifications. Bootstrap rule: when `seen-builds` is empty (first run / cleared cache), notifications are suppressed and current state is just recorded.
4. Compute per-slug failure streak from the current feed; prefix title if ≥ 3.
5. For each running build, fire "still running" banner if `(now - started) >= threshold` and id not already in `long-running-notified`. Add id.
6. Persist both maps.

## Why not SSE

Drone exposes `/api/stream` (SSE) but Raycast kills `no-view` commands after a short timeout, so a long-lived SSE connection isn't viable for the background poller. REST polling once per minute matches Raycast's lifecycle model and is simpler.

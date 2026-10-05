# Super Productivity — Raycast Extension

A Raycast extension that brings your [Super Productivity](https://super-productivity.com/) tasks, projects, tags, and current tracker into Raycast — and lets you **start or resume tracking a task from the keyboard** with a focus session auto-starting in Super Productivity when its `autoStartFocusOnPlay` toggle is enabled.

[Features](#features) · [Install](#install) · [Auto-focus on tracking](#auto-focus-on-tracking) · [Commands](#commands) · [Keyboard shortcuts](#keyboard-shortcuts) · [Architecture](#architecture) · [Development](#development) · [FAQ](#faq)

---

## Features

- **Start or resume tracking any task** with a keyboard shortcut — also auto-starts a Super Productivity focus session when configured (see [Auto-focus on tracking](#auto-focus-on-tracking) below).
- **Smart resume** — tasks you've already worked on (`timeSpent > 0`) show **Resume Tracking (X.Xh spent)** with a rewind icon (↻), so picking up where you left off is one keystroke.
- **Keyboard shortcuts** for every common action — `Enter` (Start/Resume), `Cmd+Shift+C` (Complete), `Cmd+E` (Archive), `Cmd+Backspace` (Delete), `Cmd+R` (Refresh), `Cmd+[` (Back), and more (see [Keyboard shortcuts](#keyboard-shortcuts) below).
- **Current task view** with elapsed time (today + total) and a one-key Stop action.
- **Menu-bar widget** showing the currently tracked task and elapsed time.
- **Today’s tasks** filter, _Scheduled_ tasks grouped by overdue / today / tomorrow / this week / later, **Archived** with restore, **Browse projects** with task lists, **Tags** CRUD.
- **Quick-add** with natural-language parsing (`+project #tag @tomorrow 30m`).
- **Create task** form with project + tag pickers.
- Live, read-only sync via Super Productivity’s **Local REST API** (port `127.0.0.1:3876` by default).

## Install

### From Raycast Store

1. Make sure **Super Productivity** is installed and running with `Settings → Misc → Enable local REST API` turned on (default `http://127.0.0.1:3876`).
2. Install the extension from the Raycast Store: search **“Super Productivity”**.
3. Open any command — it auto-discovers tasks via the API.

### From source (development)

```bash
git clone https://github.com/pvnkmnk/raycast-super-productivity.git
cd raycast-super-productivity
npm install
npm run dev   # opens Raycast dev with the extension live-reloading
```

The default preference `apiBaseUrl` is `http://127.0.0.1:3876`. Change it in Raycast preferences if your SP instance runs elsewhere.

> **Access Token** — optional. Super Productivity v18.16.0+ no longer issues an access token. Leave the field blank for tokenless setups. If your SP version shows a token under `Settings → Misc → Local REST API`, paste it in the extension preferences and it will be sent as a Bearer token on every request.

---

## Auto-focus on tracking

> **TL;DR.** Enable _Pomodoro_ + the **“Start a focus session when I start tracking a task”** toggle in Super Productivity. After that, **starting any task from this extension will also auto-start a focus session** — because that toggle listens for the same `/tasks/{id}/start` event this extension uses, which is indistinguishable from pressing the UI’s Play button.

➡️ **Full step-by-step setup guide: [`docs/FOCUS-SESSIONS.md`](docs/FOCUS-SESSIONS.md).**

### Why this works

Super Productivity’s Pomodoro / focus system is designed as a _state attached to an active task_, not as an independent timer. Internally the toggle is named `autoStartFocusOnPlay`; in the UI it’s labelled **“Start a focus session when I start tracking a task”**. When enabled it creates (or resumes) a focus session whenever a task timer starts — regardless of whether the start call comes from the in-app UI, a keyboard shortcut, or the Local REST API.

This extension calls `POST /tasks/{id}/start` (via `startTask` in `src/api.ts`) — the same endpoint the UI’s Play button uses — so the toggle hooks in transparently. From your perspective: pick a task in Raycast → press `Return` → open SP and the focus-mode overlay/Pomodoro timer is already running against that task.

### Quick setup

1. Super Productivity → **Settings → Pomodoro** → turn on **Pomodoro timer**; pick work/break (e.g. 25/5).
2. **Settings → Focus** (or _Focus Mode_) → enable **“Start a focus session when I start tracking a task”** _(internal: `autoStartFocusOnPlay`)_.
3. Optional but recommended: enable **Auto-start next session** + **Stop tracking time when break starts**.
4. Back in Raycast — open **View Tasks** (or **Current Task**), select any task, run **Start / Resume Tracking**.
5. Watch Super Productivity: the task becomes active **and** the focus-mode overlay / Pomodoro timer appears, time is logged against that task automatically.

> If starting a task from Raycast only starts the timer and _not_ the focus session, see [Troubleshooting](#focus-session-doesnt-start-from-raycast) below — there is a known product limitation that the SP maintainers track separately.

---

## Commands

| Command                   | Mode       | What it does                                                                                                                                          |
| ------------------------- | ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Show Task in Menu Bar** | `menu-bar` | Live readout of the currently tracked task + elapsed time.                                                                                            |
| **View Tasks**            | `view`     | Browse, search, filter by project/tag, start tracking, complete, archive, delete. _Starting tracking here also starts a SP focus session if enabled._ |
| **Today’s Tasks**         | `view`     | Tasks in Super Productivity’s Today list; same actions.                                                                                               |
| **Create Task**           | `view`     | Form: title / notes / estimate / due date / project / tags.                                                                                           |
| **Current Task**          | `view`     | Currently-tracking panel + recent-task picker for one-key start. _Starting tracking here also starts a SP focus session if enabled._                  |
| **Quick Add Task**        | `view`     | Natural-language: `+project #tag @tomorrow 30m`.                                                                                                      |
| **Scheduled Tasks**       | `view`     | Grouped overdue / today / tomorrow / this week / later.                                                                                               |
| **Archived Tasks**        | `view`     | Browse archived, restore, delete permanently.                                                                                                         |
| **Manage Tags**           | `view`     | CRUD tags (name, color).                                                                                                                              |
| **Browse Projects**       | `view`     | Project list with per-project task drill-down.                                                                                                        |

Every command that has a **Start / Resume Tracking** action — `View Tasks`, `Today’s Tasks`, `Project drill-down`, `Current Task` — participates in the [Auto-focus on tracking](#auto-focus-on-tracking) flow. The HUD toast confirms the side-effect:

> ▶️ Task started — focus session will start automatically if Pomodoro + `autoStartFocusOnPlay` are enabled in SP.

## Keyboard shortcuts

Press `Enter` on any task to invoke **Start Tracking** or **Resume Tracking**. Other common actions have explicit shortcuts:

| Action                      | Shortcut                  |
| --------------------------- | ------------------------- |
| Mark Complete               | `Cmd+Shift+C`             |
| Archive                     | `Cmd+E`                   |
| Delete / Delete Permanently | `Cmd+Backspace`           |
| Refresh                     | `Cmd+R`                   |
| Back to Projects            | `Cmd+[`                   |
| Create / Delete Tag         | `Cmd+N` / `Cmd+Backspace` |

**Resume Tracking** swaps in automatically when a task has prior tracked time — instead of **Start Tracking** (▶) it shows **Resume Tracking (X.Xh spent)** with a rewind icon (↻), so you can see at a glance which tasks already have context. Available in `View Tasks`, `Today's Tasks`, `Scheduled Tasks`, `Browse Projects` (drill-down), and `Current Task`.

In `Archived Tasks`, `Enter` triggers **Restore**, and **Delete Permanently** is bound to `Cmd+Backspace` (Archived has no Mark Complete — restore a task first, then complete it from a live view).

---

## Architecture

```
┌─────────────────┐   Local REST API    ┌──────────────────────┐
│   Raycast       │   POST start /      │  Super Productivity  │
│   extension     │ ─ GET status …      │  desktop app         │
│   (this repo)   │   http://127.0.0.1  │  (port 3876)         │
└─────────────────┘   :3876             └──────────────────────┘
                                                  │
                                                  │ autoStartFocusOnPlay
                                                  ▼
                                          ┌────────────────┐
                                          │   Focus /      │
                                          │   Pomodoro     │
                                          └────────────────┘
```

- **No focus-session endpoint.** Super Productivity does _not_ expose the focus-mode API. We rely on its own internal `autoStartFocusOnPlay` to wire `/tasks/{id}/start` to the focus-session start, exactly as if the user had clicked Play in the UI.
- **Read-only by design.** The extension only triggers task timers; it never writes to task content unless the user explicitly invokes an action (Complete, Archive, Delete, etc.).

## Development

```bash
npm install
npm run dev       # ray develop — hot reload
npm run lint
npm test
npm run build
```

## FAQ

### Can the extension start a focus session directly?

No — Super Productivity does not expose a focus-session API. We trigger the same internal event the UI’s Play button does; the _“Start a focus session when I start tracking a task”_ toggle is what bridges that event to a focus session.

### The dropdown filter shows `Inbox` and tags — is that configurable?

No, those come from the SP `/projects` and `/tags` endpoints. Filter by tag is one of the cooler features; the `inbox` value is a synthetic project meaning “no project assigned.”

### What if SP moves my port away from `3876`?

Change the **API Base URL** preference in this extension’s Raycast preferences.

### Focus session doesn’t start from Raycast

1. Verify SP version is recent (≥ v18.5.0 per the focus-mode rework) — `autoStartFocusOnPlay` was added in the focus-mode overhaul.
2. Confirm **Pomodoro timer** is on and **Start a focus session when I start tracking a task** is on — both are required.
3. Test from inside SP first: if pressing the UI’s Play button doesn’t start a focus session either, the toggle itself is the issue, not Raycast.
4. If the toggle works from the UI but _not_ from this extension, the SP implementation hasn’t yet wired `autoStartFocusOnPlay` to Local REST API starts — see the [open issue](https://github.com/super-productivity/super-productivity/issues/7239). Until then you have two workarounds: (a) start tracking manually in SP, or (b) use **Raycast Focus** alongside this extension for distraction blocking while SP tracks time.

## License

MIT

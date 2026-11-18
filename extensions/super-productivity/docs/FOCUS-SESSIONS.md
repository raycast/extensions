# Auto-start focus sessions from Raycast

This guide walks through configuring Super Productivity so that **starting a task timer from this Raycast extension also auto-starts a focus session** in Super Productivity.

When this works, every **Start Tracking** _or_ **Resume Tracking** action you fire from Raycast drops you into a Super Productivity focus / Pomodoro block against that task — no separate start click needed, no watching two timers. Tasks with prior tracked time (`timeSpent > 0`) auto-promote to **Resume Tracking (X.Xh spent)** while firing the _same_ focus wiring — see [Resume Tracking and focus sessions](#resume-tracking-and-focus-sessions) below for the _why_.

> ⏱ **Five-minute setup.** If Super Productivity is already running with Pomodoro enabled, this is two clicks.

---

## What this solves

Super Productivity does **not** expose a public focus-session API. Until it does, the only way to make focus sessions start from a third-party client (this Raycast extension, scripts, AI agents, etc.) is to light up an internal toggle inside SP itself: **`autoStartFocusOnPlay`** — the option labelled **“Start a focus session when I start tracking a task”**. When that toggle is on, SP creates a focus session whenever a task timer starts, including starts that come through the Local REST API — which is exactly how this extension starts tasks.

## Prerequisites

- Super Productivity **v18.5.0 or later** (the focus-mode rework era introduced this toggle; older builds don't have it).
- Local REST API enabled: **Settings → Misc → Enable local REST API**. Default URL `http://127.0.0.1:3876`.
- This Raycast extension installed and pointing at the same URL (default in this extension's preferences).

---

## Step-by-step

### Step 1 — Enable Pomodoro mode

Open Super Productivity → **Settings** → **Pomodoro**:

1. Toggle **Pomodoro timer** on.
2. Pick your rhythm. Reasonable defaults:
   - Work duration: **25 minutes** (classic Pomodoro)
   - Break duration: **5 minutes**
   - Long break: **15 minutes** (after every 4 work blocks)
3. Optionally enable:
   - **Auto-start next session** — work blocks chain into breaks without manual clicks.
   - **Stop tracking time when break starts** — when a break begins, the task timer pauses too, so break time never pollutes your task report.
   - **Disable sound** for breaks if you're in an open-plan office.

These can be tuned later. Save by closing the settings.

### Step 2 — Enable auto-start-on-track

Open **Settings** → **Focus** _(or Focus Mode — the section name depends on your build)_:

1. Find the toggle **“Start a focus session when I start tracking a task”**.
   > If you don't see this option, your SP version is older than v18.5.0. Update SP first.
2. Turn it **on**.
3. _(Optional)_ Set the default focus session duration if the option is exposed — typically matched to your Pomodoro work duration from Step 1.

That's the actual toggle. The rest is wiring.

### Step 3 — Verify from inside SP

Before involving Raycast:

1. Open Super Productivity's task list.
2. Pick any task.
3. Click its **Play** button.

Expected outcome:

- The task timer starts.
- A **focus-mode overlay** _(dark backdrop with a Pomodoro countdown)_ appears, or a **focus tab** opens in the side panel showing the countdown.
- When the work block ends, the configured break starts automatically _(if Auto-start next session is on)_.

If you don't see a focus overlay, the toggle in Step 2 isn't on for your build, or you're on an old SP version. Troubleshoot before moving on.

### Step 4 — Verify from this Raycast extension

Now that it works from inside SP, verify the same wiring fires when this extension starts a task:

1. Open **Raycast** → search **“View Tasks”** _(or “Current Task”)_
2. Pick any task.
3. Press `Return` to fire the **Start Tracking** action (or **Resume Tracking** if the task already has tracked time — the action label swaps automatically, see [Resume Tracking and focus sessions](#resume-tracking-and-focus-sessions)).

Expected outcome:

- The action's HUD toast reads: **▶️ Task started — focus session will start automatically if Pomodoro + `autoStartFocusOnPlay` are enabled in SP**. The same toast fires for **Resume Tracking** — both paths call the same `POST /tasks/{id}/start` endpoint, so the focus wiring is identical.
- Super Productivity's task list shows the same task as the currently active one.
- Super Productivity's focus-mode overlay / side-panel Pomodoro countdown opens against that task.

If the task timer started but **no focus overlay appeared**, see [Troubleshooting](#troubleshooting).

### Step 5 — Daily workflow

You're done. From here on:

- Start a task from **View Tasks** → focus-mode / Pomodoro fires against it.
- Start a task from **Quick Add Task** → after the task is created, **Start Tracking** (same keyboard) → focus fires against it.
- Stop a task from **Current Task → Stop Tracking** → focus session also ends.
- The keyboard shortcut **⌥ Space** _(Raycast default)_ → type the command name → still works when SP isn't focused.
- **Resume Tracking** kicks in automatically when re-engaging a task with prior tracked time (`timeSpent > 0`) — same `autoStartFocusOnPlay` wiring fires the focus session, so picking up where you left off starts a Pomodoro without an extra click.

---

## How it works (technically)

```
┌──────────────────┐                         ┌──────────────────┐
│  Raycast ext     │  POST /tasks/{id}/start │  Super           │
│  startTask(id)   │ ──────────────────────► │  Productivity    │
│                  │                         │                  │
│                  │                         │  1. set          │
│                  │                         │     currentTaskId│
│                  │                         │  2. fire         │
│                  │                         │     autoStart    │
│                  │                         │     FocusOnPlay  │
└──────────────────┘                         └──────────────────┘
```

Internally, when `autoStartFocusOnPlay` is on, SP fires a focus-session-start event in the same tick as the active-task-set event. There is no separate endpoint to call and no separate response the extension can verify; it only owns the request that sets the active task through `/tasks/{id}/start`.

Beyond that, the focus-mode overlay is owned by SP's renderer and is out of scope for this extension.

## Troubleshooting

### Menu paths vary between SP versions

| SP version | Where the toggle lives |
|||
| v18.5.0 – current (focus-mode rework) | **Settings → Focus** _or_ **Settings → Focus Mode** |
| Older focus-engine builds | **Settings → Pomodoro** _(“Start a focus session when I start tracking a task” sits beside the other Pomodoro options)_ |

Open both sections if you don't see it on the first try. The label is consistent across both.

### “I enabled the toggle but the focus overlay never appears from Raycast”

Walk through the diagnostic tree in order:

1. **Verify SP version.** Settings → About — must be ≥ v18.5.0.
2. **Verify the toggle is actually on.** Some SP builds reset toggles on settings import / sync — re-check after each restart.
3. **Verify Pomodoro is enabled.** A focus session requires _something_ focus-shaped to fire — the toggle alone won't start a session unless Pomodoro mode (or focus mode) is on.
4. **Verify from inside SP first.** Pick a task in SP, click Play. If the focus overlay doesn't appear _from inside SP_, the toggle isn't doing its job for any caller — file a SP bug, not one here.
5. **If it works from inside SP but not Raycast:** the SP implementation of `autoStartFocusOnPlay` hasn't yet wired Local REST API starts to the focus-event fire. This is a known product-side tracking concern — see super-productivity [#7056](https://github.com/super-productivity/super-productivity/issues/7056), [#7239](https://github.com/super-productivity/super-productivity/issues/7239), and #7702. Workarounds:
   - Start a task from inside SP, then switch to Raycast for the rest of the workflow.
   - Use **Raycast Focus** alongside this extension for distraction blocking while SP tracks time.
   - Use **AppleScript / keyboard automation** to bring SP to the front and trigger its in-app Play hotkey. _Fragile and OS-specific; not recommended._

### “The focus overlay appears, but the wrong task is tracked”

The `autoStartFocusOnPlay` toggle fires against the _currently active_ task, not the task that triggered the start. If you're rapidly switching tasks, the focus overlay can lag a frame or two behind the active task — that's a SP-side render-timing issue, not this extension.

### “Stopping from Raycast doesn't end the focus overlay”

Stopping from the **Current Task** view calls `POST /task-control/stop`, which clears `currentTaskId`. The focus overlay then has no active task to anchor to and depends on SP to recognise "no current task" as "no focus session". If the overlay lingers, click **Stop** in the overlay itself; SP's behaviour for empty-state focus sessions differs across versions.

## Reference

Internal flag (SP source): **`autoStartFocusOnPlay`**. UI label is **“Start a focus session when I start tracking a task.”**

- [SP Pomodoro use-case docs](https://super-productivity.com/use-cases/pomodoro/)
- [SP time-tracker docs](https://super-productivity.com/use-cases/time-tracker/)
- [Discussion: `autoStartFocusOnPlay` flag name](https://github.com/super-productivity/super-productivity/discussions/6781)
- [Issue: focus-mode rework overlay](https://github.com/super-productivity/super-productivity/issues/7702)
- [Issue: 18.5.0 release notes](https://www.reddit.com/r/selfhosted/comments/1taafra/super_productivity_v1850_focus_mode_rework/)

## Resume Tracking and focus sessions

Super Productivity's `autoStartFocusOnPlay` toggle is keyed off the _act of starting a task_, not off whether the task is being started for the first time versus resumed. Because of that:

- **Start Tracking** on a fresh task fires `POST /tasks/{id}/start` → SP sets the active task → `autoStartFocusOnPlay` creates a focus session against it.
- **Resume Tracking** on a task you've already worked on calls the _same_ `POST /tasks/{id}/start` endpoint (the Raycast action label is just a UX hint — the underlying REST call and SP-perceived "this is a start event" are identical) → SP sets the active task again → `autoStartFocusOnPlay` creates or resumes a focus session against it.

In practice: if you pause a focus session for a meeting and mark the task in progress when you get back, the **Resume Tracking** action in Raycast re-fires the same focus wiring for that task. SP itself decides whether that event becomes a fresh focus session or extends the current one — the Raycast label is just a hint, and no extra configuration is needed on either side. The only thing that changes in Raycast is the action label, which now helpfully tells you how much time you've already spent on the task (`X.Xh spent`) so you can decide at a glance whether to resume context or pivot to something else.

The label swap is driven by `timeSpent > 0` — a task with zero tracked time shows **Start Tracking**; the moment it has even a second of tracked time, it surfaces **Resume Tracking** everywhere the action appears: `View Tasks`, `Today's Tasks`, `Scheduled Tasks`, `Browse Projects` (drill-down), and `Current Task`.

**Once this is set up, every Raycast Start / Resume Tracking action becomes a Pomodoro.** 🎯

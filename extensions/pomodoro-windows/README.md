# Pomodoro for Windows

A complete Pomodoro timer for **Raycast on Windows**. The popular Pomodoro extensions in the Store are macOS-only because they are built around menu bar commands, which Raycast for Windows does not support yet. This extension is designed around what Windows Raycast *does* support.

## Commands

Just two, so there's nothing to hunt for:

**Pomodoro** — open it, **type what you're working on, press Enter.** That's it. Typing a new task while one is running switches to it (the time you already put in is still logged). The list, top to bottom:

1. **Today** — your progress toward the daily goal, time focused, this week, and streak. Always pinned at the top. Enter opens full stats & history.
2. **Now** — the running timer with live countdown. Enter pauses / resumes. Right below it, **End Session**: Enter stops and keeps the time (Ctrl+Backspace from anywhere on the timer), or Ctrl+Shift+Backspace discards the session so it doesn't count. Ctrl + K on the timer for skip, restart and breaks.
3. **Focus Presets** — 🍅 Classic 25/5, 🧠 Deep Work 50/10, ⚡ Quick Sprint 15/3, plus any you create. Give each one its own **task name** (Ctrl + T), e.g. Deep Work → "Thesis", Quick Sprint → "Email", so pressing Enter on a preset starts that task straight away. Typing a task first still overrides it, and with text typed, Ctrl + T saves it as that preset's task. Ctrl + E edits, Ctrl + Backspace deletes, Ctrl + D makes it the default for type-and-Enter. Create your own with **New Preset…**.

**Pomodoro Quick Toggle** — the same "next obvious thing" without opening anything (start your default preset, pause, resume, next interval). Put it on a hotkey. It also runs in the background to keep the timer going, and shows `🍅 Focus · 18 min left · 2/4` as its subtitle in root search, standing in for the macOS menu bar timer.

## Notifications

Inside the Pomodoro window, every action and interval ending shows a small **toast at the bottom of the window**, so Raycast stays open. When Raycast is closed (Quick Toggle hotkey, or an interval ending in the background) you get a **Raycast HUD** instead. When an interval ends you get:

- a **Raycast toast or HUD**: always, even if Windows notifications are off
- a **Windows notification** and **alarm sound** (each can be turned off in Preferences)

The first time an interval ends, Raycast asks whether to let the Pomodoro alarm open its command. Choose **Always Open Command** so future HUDs appear instantly. (Until then, the background check still shows the HUD within ~15 seconds.)

## Features

- Customizable focus presets with their own task name, focus, break and long-break lengths
- Stop and keep the time, or discard a session so it doesn't count
- Type a task and press Enter to start; type a new one to switch
- Pause, resume, restart, skip and stop
- Auto-start breaks and/or focus intervals (chained from the exact end time, so nothing drifts)
- Native Windows notification and alarm sound at the exact second an interval ends (built-in Windows sound or your own `.wav`), plus a Raycast HUD
- Daily goal, streaks, per-task totals, full session history
- Survives Raycast closing, PC sleep and reboots: state is stored as timestamps, not a ticking counter

## Setup

1. Install, then run **Pomodoro Quick Toggle** once. This turns on its background refresh (Raycast requires a first manual run).
2. Optionally give **Pomodoro Quick Toggle** a hotkey in Raycast Settings → Extensions.
3. In **Pomodoro**, press Ctrl + K → Settings → **Test Alarm Sound & Notification** to check your sound and toast.

If Windows notifications don't appear, check Windows Settings → System → Notifications: notifications on, **Windows PowerShell** allowed (that's the app the alerts come from), and Do Not Disturb off. The extension creates two tasks in Task Scheduler, “Raycast Pomodoro Alarm” and “Raycast Pomodoro Notify”.

## Preferences

Daily goal, auto-start breaks, auto-start focus, Windows notification on/off, sound on/off, built-in sound, custom `.wav`. Interval lengths live in your focus presets.

## How it works (for contributors)

- `src/lib/engine.ts` is a pure state machine (`idle → running ⇄ paused → finished`). Remaining time is always derived from timestamps, and `advance()` finalizes any intervals that ended while nothing was running, auto-starting the next from the previous end time.
- `src/lib/presets.ts` stores focus presets in `LocalStorage`. A running timer keeps a snapshot of its preset's lengths, so editing a preset never changes a timer mid-way.
- `src/lib/timer.ts` persists state and history in `LocalStorage`, and every command calls `reconcile()` first, so whichever command runs next catches the timer up.
- `src/lib/notify.ts` handles alerts. Raycast unloads an extension (and anything it spawned) shortly after a command ends, so the alarm is handed to **Windows Task Scheduler**: a one-time per-user task that fires at the exact end time, even if Raycast is closed (and on wake if the PC was asleep). The alert runs as an inline `-EncodedCommand`, never a `.ps1` file, because many PCs block script files by Group Policy even with `-ExecutionPolicy Bypass`. The alert writes a marker file; if a later background run sees it never fired, it notifies another way. The alert also opens a `raycast://` deeplink (`launchType=background`) to Quick Toggle, which finalizes the interval and shows the Raycast HUD at that moment.
- Background **Pomodoro Quick Toggle** uses `updateCommandMetadata` to put the live status in root search, and other commands nudge it with `launchCommand({ type: LaunchType.Background })` after every change.

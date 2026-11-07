# PomoFocus — Design & Implementation Plan

Raycast extension (Windows + macOS). Start/pause/resume Pomodoro timers, get an OS notification when time is up, and see a live countdown.

## Commands (manifest)

| name | title | mode | notes |
|---|---|---|---|
| `focus` | Focus | no-view | 25 min focus |
| `break` | Break | no-view | 5 min break |
| `long-break` | Long Break | no-view | 15 min break |
| `custom-focus` | Custom Focus | no-view | required argument `minutes` (1–180) |
| `toggle` | Pause / Resume | no-view, `interval: "10s"` | pauses a running timer or resumes a paused one; when launched by the background schedule it only checks for expiry and notifies |
| `pomo` | Pomo | view | live countdown of current timer |

Starting any timer while another is running replaces it. The user's existing command names are kept.

## State

Single JSON record in `LocalStorage` under key `timer`:

```ts
type TimerKind = "focus" | "break" | "long-break";
type TimerState =
  | { status: "running"; kind: TimerKind; durationMs: number; endsAt: number }   // epoch ms
  | { status: "paused";  kind: TimerKind; durationMs: number; remainingMs: number }
  | { status: "finished"; kind: TimerKind; durationMs: number; notified: boolean };
```

No record = idle. Wall-clock `endsAt` (not a tick counter) means every command and the background check compute remaining time from `Date.now()` and nothing has to stay alive. `finished.notified` makes notification delivery idempotent across the background check and the `pomo` view.

## Modules (`src/`)

- `lib/timer.ts` — pure state machine + storage: `start(kind, durationMs)`, `pause()`, `resume()`, `clear()`, `load()`, `remainingMs(state, now)`, `formatRemaining(ms)` ("24:59"). Pure functions take `now` as an argument so they are unit-testable without mocking the clock.
- `lib/notify.ts` — `notify(title, body)`: on `darwin` runs `osascript -e 'display notification …'`; on `win32` runs `powershell -NoProfile -Command` with a WinRT `ToastNotificationManager` script. Uses `child_process.execFile` (no shell interpolation of user text; arguments passed as an array / escaped for the script). Falls back to `showHUD` if the process fails.
- `lib/sound.ts` — `playSound("toggle" | "done")`: plays a WAV from `assets/sounds/` (path via `environment.assetsPath`). macOS: `afplay <file>`. Windows: `powershell -NoProfile -Command "(New-Object Media.SoundPlayer '<file>').PlaySync()"`. Fire-and-forget via `execFile`; a playback failure is logged and never blocks the command. WAV is the only format both built-in players handle.
  - `toggle.wav` plays on start (all four start commands), pause, and resume.
  - `done.wav` plays when a timer expires, alongside the notification.
  - Both files are short (<1 s) synthesized beeps generated once by a small Node script (`scripts/gen-sounds.mjs`, checked in) so the repo has working audio from day one; swap in your own WAVs at any time.
- `lib/expiry.ts` — `settleExpired()`: load state; if running and `endsAt <= now`, store `finished{notified:true}`, call `notify`, and play `done`. Returns the new state. Shared by `toggle` (background launches) and `pomo`.
- Command files: `focus.ts`, `break.ts`, `long-break.ts`, `custom-focus.ts` (validates argument, errors via `showToast` on bad input), `toggle.ts` (branches on `environment.launchType`: background → `settleExpired()`, user → pause/resume with a HUD), `pomo.tsx`.

## `pomo` view

`Detail` with a large markdown countdown, metadata (kind, status, ends-at), and actions: Pause/Resume, Start Focus/Break/Long Break, Clear. A 1 s `setInterval` re-reads remaining time from the stored `endsAt`; on reaching zero it calls `settleExpired()` so the notification fires immediately if the view is open. Idle state shows "No timer" with the start actions.

## Notification timing

The background check runs every 10 s, so a notification arrives at most ~10 s after expiry (Raycast says scheduling is approximate and may be throttled on battery). If the `pomo` view is open it fires at the exact second. Accepted trade-off vs. spawning a detached sleeper process, which would need kill/respawn on pause and is harder to keep correct on both OSes.

**Risk:** Raycast's background-refresh docs only describe macOS behaviour. Verify on Windows during implementation; if interval commands don't run there, fallback is a detached PowerShell `Start-Sleep; toast` process spawned on start/resume and killed on pause (tracked by PID in state).

## Testing

- Unit tests (vitest, add as devDependency) for `lib/timer.ts` and `lib/expiry.ts` with injected `now` and an in-memory storage stub. Covers: start/pause/resume math, resume after pause keeps remaining, expiry idempotence, format rounding.
- Manual: `npm run dev`, start a 1-minute custom timer, close Raycast, confirm notification on each OS; open `pomo` and confirm live countdown and pause/resume.

## Implementation order

1. Manifest: add `custom-focus` (with argument), `pomo`, and `toggle` (replaces pause/resume, carries the interval) commands; add vitest script + devDependency.
2. `lib/timer.ts` with tests.
3. `lib/notify.ts` and `lib/sound.ts` (both platforms) plus `scripts/gen-sounds.mjs` to produce `assets/sounds/toggle.wav` and `done.wav`; smoke-test both manually on this Windows machine.
4. `lib/actions.ts` with tests; `toggle.ts`.
5. Start command files.
6. `pomo.tsx` view.
7. `ray lint`, `ray build`, manual end-to-end on Windows; note macOS as untested if no Mac available.

## Out of scope (YAGNI)

Auto-chaining focus → break, session counters/history, sounds, menu-bar countdown, preferences for default durations.

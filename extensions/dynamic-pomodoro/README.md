# Dynamic Pomodoro for Raycast

Adaptive countdown timer with minute controls and max 60 minutes.

## Run locally

1. Install dependencies:
   `npm install`
2. Start development mode:
   `npm run dev`
3. In Raycast, run command:
   `Dynamic Pomodoro`
4. Optionally run:
   `Dynamic Pomodoro Menu Bar` to keep elapsed time visible in macOS menu bar.

## Behavior

- Updates every second while running.
- Persists state in local storage.
- Restores timer state when command opens again.
- Includes a menu bar command that shows Dynamic Pomodoro status text.
- Includes an internal background sync command that checks completion while commands are inactive.
- Minutes are editable only (1..60) with arrow shortcuts on the timer row.
- `→/←` changes by `1` minute, `Cmd+→/Cmd+←` changes by `5` minutes (paused/stopped only).
- Completion sound duration is capped (default `5s`, configurable `1..15s` in preferences).
- Completion sound is rate-limited: if the previous sound played less than `10s` ago, sound is skipped while visual notifications still appear.

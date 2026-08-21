# Punch Clock

A Raycast extension to track your working hours on macOS.

## How it works

1. Run **Start Work Timer** and enter:
   - Your total working time for the day (hours + minutes), e.g. `8h 0m`.
   - Your break length, e.g. `30` minutes.
2. The countdown (working time + break) starts immediately and shows live in the
   macOS menu bar via the **Work Timer** menu-bar command.
3. Click the menu bar item to see:
   - The time the timer was **started**.
   - The time it is expected to **expire**.
   - The time it was **stopped**, if you paused it.
4. Use the dropdown to **Stop**, **Resume**, **Start New Timer**, or **Reset**.

## Development

```bash
npm install
npm run dev
```

This opens Raycast in development mode and enables both commands:

- `Start Work Timer` (`src/start-timer.tsx`) — a form to configure and start the timer.
- `Work Timer` (`src/menu-bar.tsx`) — the live menu bar countdown.

Timer state is persisted with Raycast's `LocalStorage` so it survives Raycast restarts.


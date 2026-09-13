# Seconds Clock

Seconds Clock is a focused digital clock for Raycast with always-visible seconds, polished multi-timer support, and a stopwatch.

It is designed to stay lightweight: a large flip-clock-inspired Raycast view, named timers, one stopwatch, and one time-format preference. No alarms, world clocks, clipboard actions, or extra utilities.

## Commands

### Show Seconds Clock

Opens the main clock view with:

- Hours, minutes, and seconds
- Date in `DD - MM - YYYY` format
- 12-hour or 24-hour display based on the extension preference

### Set Timer

Opens a focused timer form with:

- One searchable input for timer duration
- Friendly formats like `30m 20s`, `2hr 5min 3 sec`, `1h 5m`, or `1:30:00`
- Optional names in the same input, like `Tea 15m`
- Favorite timers that can be started again quickly
- Multiple timers can run at once

### Manage Timers

Shows all running timers with actions to:

- Rename timers
- Save timers as favorites
- Stop one timer
- Stop all timers

### Stop Timer

Stops the only running timer immediately, or shows a selection list when multiple timers are running.

### Start Stopwatch

Starts a stopwatch from zero.

### Stop Stopwatch

Stops the running stopwatch without affecting timers.

### Show Stopwatch

Shows the current stopwatch elapsed time live in Raycast. Press `Command-K` to
stop the stopwatch without leaving the view.

Timer behavior:

- Multiple named timers at once
- Countdown with seconds
- Add 5 or 30 minutes from Manage Timers
- Finished timers are removed automatically when Manage Timers refreshes

Stopwatch behavior:

- Counts up from zero
- Shows elapsed hours, minutes, and seconds in the command
- Can be stopped without affecting timers

## Preference

Seconds Clock has one preference:

- **Time Format**: `12-hour` or `24-hour`

The default is `12-hour`.

## Development

```bash
npm install
npm run dev
```

Validate before publishing:

```bash
npm run lint
npm run build
```

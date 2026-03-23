# Simple Timer

A fast, keyboard-first timer extension for Raycast on Windows. Start timers, run a stopwatch, or set up a Pomodoro session — all from the search bar.

> **Windows only.** This extension was built and tested exclusively on Raycast for Windows.

---

## Features

### Timer
Type a duration directly in the search bar and press Enter.

| Input | Result |
|-------|--------|
| `5m` | 5 minutes |
| `1h30` | 1 hour 30 minutes |
| `30m20` | 30 minutes 20 seconds |
| `@18:00` | countdown to 18:00 |
| `send email 5m` | 5 min timer with note |

Typing a number like `5` shows smart suggestions — 5 minutes, 50 minutes, 5 seconds, 5 hours.

### Stopwatch
Type `sw` or `stopwatch` to start a stopwatch counting up from zero. Add a note with `sw my note`.

### Pomodoro
Type `pomo` or `pomodoro` to open the setup page, or use the quick syntax:

| Input | Result |
|-------|--------|
| `pomo:25m:5m` | 25 min work + 5 min break |
| `pomo:25m:5m:4` | 4 cycles |
| `meeting pomo:25m:5m` | with note |

Phases switch automatically with a short alert between each.

### Multiple timers
Run as many timers simultaneously as you need. All timers, stopwatches, and Pomodoro sessions run in the background — even when Raycast is closed.

### Presets
Six configurable preset timers, each assignable to a global hotkey in Raycast Settings.

### Alerts
- Choose from 5 alert sounds (Bell, Chime, Pulse, Soft, Digital)
- Set alert duration or play until dismissed
- Windows notifications (optional)
- Sounds play even when Raycast is closed

### History
Dismissed timers are saved to history with notes. Repeat any past timer with Ctrl+R.

---

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Space` | Pause / Resume |
| `Ctrl+Enter` | Cancel / Stop |
| `Ctrl+1–6` | Start preset 1–6 |
| `Ctrl+R` | Repeat last timer |
| `Ctrl+H` | Open history |
| `Ctrl+K` | Actions menu |

---

## Requirements

- Raycast for Windows (beta)
- .NET Runtime (included with Windows 10/11)

---

*This extension was built with the help of Claude (Anthropic) through an iterative vibe-coding process.*

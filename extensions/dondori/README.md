# Dondori

Control [Dondori](https://dondori.io) — a floating todo app for macOS — straight from Raycast: browse today's tasks, add tasks with natural-language input, control timers, and jump to any window.

## Requirements

1. **Dondori.app** installed — [download for macOS](https://dondori.io/download/mac) (free, notarized).
2. **Raycast integration enabled** in the app: open Dondori → **Settings → General → Raycast integration**. This starts the local socket that the task list and timer commands use.

The window commands (Open Todos, Open Notes, Open Calendar, Open Task Pool, Toggle Focus Mode) work via `dondori://` deep links and don't need the integration toggle — they can even launch the app if it isn't running.

## Commands

| Command               | What it does                                                                                                                                                           |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Today's Tasks**     | Lists today's tasks grouped by status. Actions: Open in App (⏎), Toggle Done (⌘D), Start/Stop Timer (⌘T). Shows priority, tracked time, and a running-timer indicator. |
| **Quick Add**         | Adds a task from one natural-language string: `Buy milk tomorrow 15:00 #home`. Supports dates, times, #tags, priority, and recurrence.                                 |
| **Open Todos**        | Opens the main todo panel.                                                                                                                                             |
| **Open Notes**        | Opens Floating Notes.                                                                                                                                                  |
| **Open Calendar**     | Opens the calendar grid.                                                                                                                                               |
| **Open Task Pool**    | Opens the backlog task pool.                                                                                                                                           |
| **Toggle Focus Mode** | Toggles focus mode.                                                                                                                                                    |

## Troubleshooting

If Today's Tasks or Quick Add report that Dondori is unreachable, make sure the app is running and **Raycast integration** is enabled in Settings. Quick Add automatically falls back to a deep link when the socket is unavailable.

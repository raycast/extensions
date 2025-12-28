# Habit Tracker (Raycast Extension)

A minimal, offline-first habit tracker for Raycast.

## Features
- **Fast & Keyboard-first**: Log habits with a single keypress.
- **Offline & Private**: All data stored locally in Raycast.
- **Streak & Progress**: Visual indicators for daily progress and streaks.
- **Insights**: View strongest and weakest habits.
- **Management**: Add, Edit, Pause, and Delete habits.

## Data Model

### Habit
- `id`: UUID
- `name`: string
- `frequency`: 'daily' (Custom frequency support planned)
- `is_paused`: boolean
- `created_at`: string (ISO)

### Logs
Stored as a map of `YYYY-MM-DD` -> `DayLog`.
- `status`: 'completed' | 'skipped'

## Streak Logic
- **Streak**: Consecutive days of completion.
- **Skip**: Maintains the streak (does not reset it, does not increment it).
- **Miss**: Breaks the streak.
- **Today**: If not logged yet, does not break streak (unless yesterday was also missed).

## Commands

### `Habit Tracker` (index)
- **Enter**: Log habit / Undo.
- **Cmd+S**: Skip for today.
- **Cmd+N**: Add new habit.
- **Cmd+E**: Edit habit.
- **Cmd+K**: More actions (Resume, Delete).

### `Habit Insights` (insights)
- Overview of best performing habits.

## Development

1. `npm install`
2. `npm run dev`

## Extension
Built with Raycast API + React + TypeScript.
Stored using `LocalStorage`.

# AGENTS.md

This file provides guidance for AI coding assistants working on the Better Time Log project.

## Project Overview

**Better Time Log** is a Raycast menu bar extension for macOS that brings time tracking and Pomodoro timers directly to the system menu bar. The primary goal is **menu bar-first usability**—users should be able to start, stop, pause, and manage timers without ever leaving the top bar or opening a full window.

## Core Design Philosophy

1. **Menu Bar is the Primary Interface**: All essential timer operations must be accessible from the menu bar icon. The menu bar command (`start-time.tsx`) is the heart of this extension.

2. **Minimal Friction**: Users should start tracking time with as few clicks as possible. Quick presets (Instant Timer, 25/5 Pomodoro, 50/10 Deep Work) are available directly in the menu.

3. **Always Visible Progress**: The current timer state (elapsed time, remaining time, phase) is displayed in the menu bar title itself—no need to click to see status.

4. **Standalone Commands as Shortcuts**: Commands like `stop-timer`, `pause-timer`, `resume-timer` exist as Raycast commands so users can bind keyboard shortcuts to them.

## Project Structure

```
src/
├── start-time.tsx          # Main menu bar command (primary interface)
├── start-timer.tsx         # Full-screen form for starting timers
├── stop-timer.ts           # No-view command to stop active timer
├── pause-timer.ts          # No-view command to pause
├── resume-timer.ts         # No-view command to resume
├── cancel-timer.ts         # Cancel without logging
├── skip-pomodoro-phase.ts  # Skip current Pomodoro phase
├── assign-project.tsx      # Update project for active timer
├── pomodoro-presets.tsx    # List of curated Pomodoro presets
├── time-log-history.tsx    # Browse and filter logged sessions
├── lib/
│   ├── timer-store.ts      # Core timer logic, state persistence, utilities
│   └── menu-bar.ts         # Helper to refresh menu bar state
└── components/
    ├── timer-form.tsx      # Reusable timer creation form
    └── project-form.tsx    # Reusable project assignment form
```

## Key Files

### `lib/timer-store.ts`
This is the **single source of truth** for all timer logic:
- Timer state management (`ActiveTimer`, `SessionLog`)
- LocalStorage persistence
- Pomodoro phase advancement (`advancePomodoroPhase`)
- Pause/resume logic
- Duration formatting utilities

When adding timer-related logic, add it here—not in individual commands.

### `start-time.tsx`
The main menu bar interface. Contains:
- Live timer display with 1-second tick updates
- Quick start presets
- Recent session history
- All timer control actions

This file is larger than others because it orchestrates the entire menu bar experience.

## Conventions

### Timer Modes
- `"open"`: Open-ended timer or countdown timer with optional target duration
- `"pomodoro"`: Structured focus/break cycles

### Pomodoro Phases
- `"focus"`: Work period
- `"break"`: Rest period

### State Persistence
All timer state is stored in Raycast's `LocalStorage`:
- `better-time-log/active-timer`: Current running timer (JSON)
- `better-time-log/history`: Array of completed sessions (JSON)

### Error Codes
Functions throw errors with specific messages:
- `"ACTIVE_TIMER_EXISTS"`: Trying to start when timer is running
- `"NO_ACTIVE_TIMER"`: Trying to stop/pause when no timer exists
- `"ALREADY_PAUSED"`: Timer is already paused
- `"NOT_PAUSED"`: Trying to resume a non-paused timer

## Adding New Features

1. **New timer actions**: Add the core logic to `timer-store.ts`, then call it from commands
2. **New menu bar items**: Modify `start-time.tsx`, keeping conditional rendering for context-aware UI
3. **New standalone commands**: Create a new `.ts` or `.tsx` file in `src/` and register it in `package.json`

## Testing

Run the development server:
```bash
npm run dev
```

Build for production:
```bash
npm run build
```

Lint:
```bash
npm run lint
```

## Dependencies

- `@raycast/api`: Raycast extension API
- `@raycast/utils`: Raycast utility hooks

## Notes for AI Assistants

- Always maintain menu bar usability as the top priority
- Keep `timer-store.ts` as the single source of truth for timer logic
- Avoid duplicating logic between commands—extract shared logic to `lib/`
- The extension runs on macOS only (Raycast limitation)
- Use TypeScript strict mode conventions

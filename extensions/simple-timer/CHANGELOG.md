# Changelog

## [1.0.1] - 2026-03-23

### Fixed
- Sound label in timer/pomodoro detail view now shows the correct per-timer sound instead of the global setting
- Dismissing one finished timer no longer stops alert sounds from other running timers

---

## [1.0.0] - 2026-03-23

### Added

**Timer**
- Custom duration input: `5m`, `1h30`, `30m20`, `@18:00`, `send email 5m`
- Smart suggestions when typing a bare number (e.g. `5` → 5 min, 50 min, 5 sec, 5 hours)
- Timers run in the background via a native worker process — even when Raycast is closed
- Alert sound plays on completion with configurable duration and volume
- Windows toast notifications on timer completion
- Timer notes — add context inline or via Actions
- Multiple timers running simultaneously

**Stopwatch**
- Start with `sw` or `stopwatch`, optionally with a note (`sw my note`)
- Pause / Resume / Stop
- Saved to history on stop

**Pomodoro**
- Start with `pomo` or `pomodoro` for setup, or use quick syntax: `pomo:25m:5m`
- Supports compound durations: `pomo:33m40s:7m30s`
- Optional cycle count: `pomo:25m:5m:4`
- Note support: `meeting pomo:25m:5m`
- Phases switch automatically with a short alert
- Edit cycles during a running session

**Presets & History**
- 6 configurable preset timers with Ctrl+1–6 shortcuts
- Recent timers (last 3) with Ctrl+R repeat
- Timer history (last 10) with repeat, copy note, and delete
- All presets and global commands assignable to hotkeys in Raycast Settings

**Sound**
- 5 alert sounds: Bell, Chime, Pulse, Soft, Digital
- Configurable alert duration (5s, 15s, 1 min, until dismissed, custom)
- Sound preview before selecting
- Per-timer sound and volume settings
- Global notifications toggle

**Global Commands**
- Start Preset 1–6
- Repeat Last Timer
- Dismiss Finished Timers

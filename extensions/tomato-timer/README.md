# Tomato Timer

A Pomodoro timer for Raycast on Windows. Type `pomodoro`, write what you are about to work on, press Enter, and a small floating countdown stays on screen until the session ends.

## Features

- **Floating timer.** An always-on-top countdown with pause, stop and hide buttons (hover to see them). Drag it anywhere; it remembers the spot.
- **Notification and sound** when a session ends, even with Raycast closed.
- **Big timer in Raycast** with the ring, the end time and your progress in the current cycle.
- **History** grouped by day, with a timeline of each day. Sessions stopped after at least one minute are kept and marked.
- **Charts:** today's progress toward your daily goal, the last 7 days, a 16-week heatmap, streaks and the time of day you focus best.
- **Export** the whole history as CSV.

## Preferences

Focus, short break and long break lengths, how many sessions until a long break, the daily goal, and toggles for the floating timer and the sound.

## How the floating timer works

Raycast extensions cannot draw windows outside Raycast, so the floating timer is a small WPF window run by Windows PowerShell (`assets/overlay.ps1`), which ships with Windows. The same script shows the end-of-session notification and plays the sound, which is why it also runs, hidden, when the floating timer is turned off.

The script only reads and writes this extension's own support folder: the running session (`active.json`), its position on screen and a small log. It makes no network requests. It closes itself when the session ends, is stopped or is replaced.

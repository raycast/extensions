# Seconds Clock Changelog

## [Reliability Improvements] - {PR_MERGE_DATE}

- Updated the Raycast API dependency.
- Reduced unnecessary LocalStorage polling in activity views.
- Hardened timer, stopwatch, favorite, and legacy state parsing.
- Removed the unreliable menu-bar timer surface.
- Removed the unreliable background timer notification worker.
- Kept Manage Timers open while actions show non-closing toasts.

## [Initial Release] - {PR_MERGE_DATE}

- Added a large flip-clock-inspired seconds clock.
- Added 12-hour and 24-hour time format support.
- Added multiple named countdown timers with favorites.
- Added timer management, renaming, stopping, and timer selection.
- Added a stopwatch command.
- Added a live Show Stopwatch command.

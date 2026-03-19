# System Monitor Changelog

## [Fix Zombie Process Accumulation] - {PR_MERGE_DATE}

- Add revalidation guards to prevent overlapping child process spawns in the menubar command
- Increase polling intervals (1s → 3s for stats, 3s → 5s for temperature) to reduce process spawn rate

## [Fix Stale Menubar Readings] - 2026-03-16

- Enable background refresh for the menubar command so pinned stats stay up to date

## [Fix Temperature Polling] - 2026-03-16

- Moved temperature sensor polling to a dedicated 3s interval to prevent stale readings

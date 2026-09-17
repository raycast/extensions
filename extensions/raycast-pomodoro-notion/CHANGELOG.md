# PomoNotion Raycast Extension Changelog

## [1.0.1] - 2026-07-12

- Fix looping work/break BGM not stopping on pause, break transition, or session end (especially Store installs)
- Open **Start Pomodoro** directly on the session type chooser instead of an intermediate detail screen

## [Initial Release] - 2026-07-10

- Pomodoro cycles with work, short break, and long break sessions
- Log work sessions to a Notion database with note, focus level, start time, end time, and active minutes
- Save `Time` as a number excluding paused minutes for Notion charts and dashboards
- Loop bundled BGM for work and breaks, with customizable sound files and volume in preferences
- Play an alarm when a session ends
- Pause, resume, early finish, and discard sessions from Raycast commands
- Validate Notion Connect settings and required database properties with **Configure Notion**
- Restore in-progress sessions after reopening Raycast
- macOS only

# Changelog

## [Fix today's stats ignoring the in-progress session] - 2026-08-26

### Fixed

- The menu bar command's "Today's Stats" no longer omits the session that is
  currently running. `loadDailyStats` read the `currentState` React state
  variable, but it is called from `loadData` immediately after
  `setCurrentState`, so the closure still held the previous value (`null` on a
  background refresh). Today's Standing/Sitting/Total therefore only ever
  counted completed sessions and showed `0s` until the user toggled state. The
  active state is now passed in explicitly, matching how
  `checkAndShowMotivation` already receives it.

## [1.0.0] - 2026-02-05

### Added

- Initial release of Standing Desk Tracker
- Real-time tracking of standing and sitting sessions
- Menubar integration with status display
- Statistics dashboard with day/week/month views
- Smart notifications for sitting warnings and daily standing goals
- Quick toggle command for switching states
- Session history and statistics calculation
- Configurable preferences for notifications and goals

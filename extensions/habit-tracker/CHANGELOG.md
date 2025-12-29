# Changelog

All notable changes to the Habit Tracker extension will be documented in this file.

## [1.1.0] - 2024-12-28

### Added

- **Custom Frequency Support**: Create habits for specific days of the week (e.g., Mon, Wed, Fri)
  - New frequency selector in Create/Edit habit forms
  - Smart streak calculation that respects custom schedules
  - Non-due days don't break streaks
  - Menu bar only shows habits due today
  - Calendar view distinguishes due vs. non-due days

- **Visual Stats**: 30-day completion progress bar displayed for each habit in the main list

- **Live Metadata**: Pending habits count shown in the Raycast command subtitle before opening

- **Menu Bar Command**: Quick-access widget showing pending habits with one-click completion

- **Calendar View**: Monthly habit history visualization with emoji indicators:
  - ✅ Completed
  - ➖ Skipped
  - ❌ Missed (past due days)
  - ~~strikethrough~~ Non-due days

- **Missed Habits View**: Review and log habits from the last 3 days

- **Weekly Review**: Summary of weekly completion rates per habit

- **Global Shortcuts**: `Cmd+N` to create a habit from any view

### Fixed

- ESLint circular dependency error resolved by using compatible `@raycast/eslint-config@1.0.11`
- Streak calculation bug when handling custom frequencies
- Various unused variable and type errors cleaned up

### Changed

- **Enhanced Insights View**: Now shows three sections:
  - 🔥 Best Current Streaks (top 3)
  - 🏆 Longest Streaks Ever (top 3 all-time)
  - ⚠️ Needs Attention (bottom 3 with comparison to best)
- Insights section title corrected from "Shortest Stream" to "Shortest Streak"

## [1.0.0] - Initial Release

- Core habit tracking with daily logging
- Streak tracking (current and longest)
- Habit pause/resume functionality
- Skip day support
- Habit details with statistics

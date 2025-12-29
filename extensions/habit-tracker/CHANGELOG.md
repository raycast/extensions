# Habit Tracker Changelog

## [Enhanced Insights & Custom Frequencies] - {PR_MERGE_DATE}

### Added
- Custom frequency support: Create habits for specific days of the week (Mon, Wed, Fri, etc.)
- Enhanced Insights view with three sections: Best Current Streaks, Longest Streaks Ever, Needs Attention
- Visual stats: 30-day completion progress bar for each habit
- Live metadata: Pending habits count shown in command subtitle
- Menu bar command: Quick-access widget with one-click completion
- Calendar view: Monthly history with emoji indicators (✅ ➖ ❌) and frequency awareness
- Missed habits view: Review and log habits from the last 3 days
- Weekly review: Summary of weekly completion rates
- Global `Cmd+N` shortcut to create habits from any view


### Changed
- Menu bar now only shows habits due today
- Calendar view distinguishes due vs. non-due days with strikethrough
- Progress visualization now uses Raycast's `getProgressIcon` for cleaner UI in habits list and weekly review

## [Initial Release] - 2025-12-27

- Core habit tracking with daily logging
- Streak tracking (current and longest)
- Habit pause/resume functionality
- Skip day support
- Habit details with statistics

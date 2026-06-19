# Workouts Changelog

## [Improved Search Command Display] - 2026-03-29

- Show activity name as the list item title instead of the sport type (which is already conveyed by the icon)
- Group activities by month with section headers
- Use locale-aware relative dates (today, yesterday, weekday name, then short date)
- Add detail panel fields: description, max speed, weighted average power, average cadence, max heart rate, max/min elevation, start time, kudos, achievements, and PRs
- Show workout type, commute, and trainer tags in the detail panel
- Add units to average power (W) and spacing to elevation (ft/m)
- Fix timezone handling for local activity dates
- Include sport type name in search keywords

## [Windows release] - 2025-06-24

- Make available on Windows

## [🐛 Fix Desktop Path] - 2025-06-23

Fixes a bug where the desktop path was not being correctly resolved on Windows.

## [✨ AI Enhancements] - 2025-02-21

Added tools to get workouts, routes, clubs and leaderboards

## [Add Command to Calculate Time or Pace] - 2025-01-13

Added a command to calculate the time or pace for a workout

## [Removed AI features] - 2024-11-28

Removed AI features after Strava updated their terms to not allow it.

## [Added a new view on Create Activity Command success] - 2024-08-30

Added a new view after successfully creating an activity

## [Add Routes Command] - 2024-08-29

List all your routes with the `routes` command and download them as GPX/TCX files

## [Enable maps] - 2024-08-06

Enabled maps for everyone without the need for a personal API key

## [Add Command Keywords] - 2024-08-06

## [Add Create Activity Command] - 2024-07-24

Added a command to create a manual activity

## [Remember selected club] - 2024-07-02

- Saved last selected club in LocalStorage for the leaderboard command

## [Analyze workout] - 2024-05-09

- Add "Analyze workout" command to get a detailed analysis and suggestions for a specific workout.
- Add weekly stats to the menu bar

## [Refresh interval update] - 2024-05-09

Updated menu bar refresh interval

## [Leaderboards bug fix] - 2024-04-27

Fix a bug where multi-sport clubs were not able to see the leaderboard.

## [Add Leaderboard] - 2024-04-27

Added leaderboard command to compare your activities with other users in your club.

## [Initial Version] - 2024-04-12

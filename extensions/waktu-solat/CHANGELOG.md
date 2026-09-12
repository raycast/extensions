# Waktu Solat Changelog

## [Raycast v2 Upgrade and Reliability Improvements] - {PR_MERGE_DATE}

- Improve initial loading, loading indicators, and empty states for prayer times.
- Add user-visible error handling when JAKIM prayer-time or zone data is unavailable.
- Add a working refresh action for prayer times.
- Centralize network requests, JSON caching, cache invalidation, and error toasts in a shared loader module.
- Cache prayer times by zone and year, with support for forced refreshes.
- Cache prayer zones and recover automatically from invalid cached data.
- Share stored-zone prayer-time loading between the main command and menu bar command.
- Modernize prayer-time parsing and formatting with `date-fns`, including current, next, and relative-time indicators.
- Improve the menu bar presentation with configurable templates, current/upcoming/past sections, loading states, and empty states.
- Modernize dependencies and development tooling.

## [Update] - 2024-01-16
- Fix some issue and logic on menubar
- Monotone icon in menubar

## [Update] - 2023-12-17
- Refine menubar
- Include more user preference options
- Change icon
- Sync selected zone between commands and menubar

## [Update] - 2023-10-11
- Added View Waktu Solat on Menu Bar

## [Initial Version] - 2023-07-26

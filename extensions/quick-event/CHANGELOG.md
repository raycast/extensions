# Quick Event Changelog

## [Add Reminder Support] - {PR_MERGE_DATE}

- Add support for custom event reminders/alerts using natural language (e.g., "remind me 5 min before", "add reminder for 3 hours before", "with 15m reminder", "remind me at start").
- Display recognized reminders with a badge in the quick event results list.

## [Update] - 2026-07-09

- Add timezone support. Specify a timezone abbreviation (ET, CT, PT, CET, JST, GMT-1, UTC+5:30, etc.) in your query and the event time is automatically converted to your local timezone. Named zones handle DST correctly.

## [Update] - 2025-06-10

- Update location parsing to use "@" and replace AI.ask. It now supports locations in `@location`, `@location-location`, or `@(location)`

## [Update] - 2025-04-22

- Add location parsing for event creation

## [Update] - 2024-08-19

- Add new timePatterns

## [Fix create event issue] - 2024-09-20

- Fix the issue where events with quotation marks in the title cannot be created.

## [Update] - 2024-10-22

Add more hotkeys for multiple calendars

## [Extension Preference for Focus on Calendar on completion] - 2022-12-17

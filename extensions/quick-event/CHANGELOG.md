# Quick Event Changelog

## [Calendar selector, time ranges, timezones, smart dates] - {PR_MERGE_DATE}

- Add calendar selector with `/calendarname` syntax and fuzzy matching
- Add time range parsing (e.g., "2-3pm", "2pm-3pm")
- Add timezone support (e.g., "3pm EST", "3pm ET")
- Add smart date handling for past dates (auto-advance to next year)

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

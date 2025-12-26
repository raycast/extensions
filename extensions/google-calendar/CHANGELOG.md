# Google Calendar Changelog

## [Quick Create Event Command] - {PR_MERGE_DATE}

- **New Command**: Added "Quick Create Event" for creating calendar events using natural language
- **Calendar Selection**: Use `/calendarname` syntax with fuzzy matching to target specific calendars
- **Time Parsing**: Supports various formats including `2-3pm`, `2pm-3pm`, `9-930`, and EU formats like `14h`, `14h30`
- **Timezone Support**: Append timezone codes like `3pm EST`, `3pm PT` to set event timezone
- **Smart Date Handling**: Past dates automatically advance to next year; bare times 1-4 default to PM
- **Duration Shortcuts**: Use `=30m`, `=1h`, `for 30 minutes`, or `for 1 hour` to set duration
- **Event Types**: Create Out of Office events with `ooo` prefix, or Focus Time with `focus`, `ft`, `deep work`
- **Multi-day Events**: Support for date ranges like `Dec 26-Jan 2`, `tomorrow through Friday`, `Feb 3-26`
- **Recurring Events**: Simple patterns like `every Monday`, `weekly`, `biweekly`, plus complex patterns like `every third Thursday`, `every last Friday`
- **Location**: Add with `@location` or `@(Conference Room B)` for multi-word locations
- **Notes**: Append notes with `// your notes here`
- **URLs**: Automatically detected and added to event description
- **Attendees**: Invite people with `with email@domain.com`
- **Alerts**: Set reminders with `!15m`, `alert 15m`, or `remind 1h`
- **Show As**: Mark availability with `~free` or `~busy`
- **Time Keywords**: Use `morning`, `noon`, `afternoon`, `evening`, `night`, `midnight`

## [1.3.1] - 2025-11-25

- Allow the user to configure if they wish to open a meeting directly as the default action instead of the calendar event, defaults to the existing behaviour.

## [1.3.0] - 2025-05-30

- Feat(create-event): Enable creating events with natural language duration string input.
- Chore(deps): Added `parse-duration`.

## [1.2.1] - 2025-05-30

- Changed "Copy Meeting Link" action shortcut to "cmd + shift + ," to not conflict with "Copy Event Title"

## [1.2.0] - 2025-05-30

- Added listing of calendars (request [#17411](https://github.com/raycast/extensions/issues/17411))
- Fix issue with timezones in calendar event creation using AI
  - Reported [#17601](https://github.com/raycast/extensions/issues/17601), [#17831](https://github.com/raycast/extensions/issues/17831), [#17585](https://github.com/raycast/extensions/issues/17585)
- Remove auto creation of Google Meet link on creating event using AI (request [#17802](https://github.com/raycast/extensions/issues/17802))
- No longer ask for confirmation when creating events without attendees
- Improved delete event confirmation

## [1.1.0] - 2025-03-04

### Changed

- Improved timezone handling across the extension
- Updated test fixtures to use explicit timezone offsets
- Modified contact search query handling for better partial matches

## [Initial Version] - 2025-02-25

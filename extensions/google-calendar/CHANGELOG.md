# Google Calendar Changelog
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

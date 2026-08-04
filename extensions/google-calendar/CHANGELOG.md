# Google Calendar Changelog

## [Expand AI Calendar API Support] - 2026-07-20

- Expand the AI extension to support rich event creation and editing, including all-day and recurring events, attendees, reminders, visibility, availability, conferencing, attachments, special event types, imports, and recurring instances
- Add AI tools for event details, invitation responses, suggested meeting times, event moves, quick add, custom event labels, calendar management, calendar-list preferences, sharing rules, settings, and live color palettes
- Support Google Calendar's custom event labels and colors with `eventLabelId` and `eventLabelVersion=1` while retaining legacy `colorId` compatibility
- Use safe partial event updates to preserve fields the user did not change, and return consistent rich event data from event tools
- Upgrade `@googleapis/calendar` to v15 and add unit tests plus expanded AI eval coverage for the new workflows

## [Revert Narrow OAuth Scope] - 2026-07-15

- Revert [#28925](https://github.com/raycast/extensions/pull/28925) and restore the broad `calendar` OAuth scope to avoid forcing re-authentication for existing users

## [Narrow OAuth Scope] - 2026-07-08

- Narrow OAuth scope from `calendar` (full read/write) to `calendar.events` + `calendar.calendarlist.readonly` + `calendar.freebusy` for least-privilege access
- Derive conference solution types from the calendar list instead of a separate `calendars.get` call
- Remove unused `getAutoAddHangouts` dead code

## [1.4.4] - 2026-06-26

- Add a `color` parameter to the `create-event` and `edit-event` AI tools so events can be created and recolored with a specific Google Calendar color (named color, `colorId` 1–11, or a hex code that snaps to the nearest supported event color)

## [1.4.3] - 2026-05-12

- Fix Google OAuth authentication by using Raycast's built-in Google OAuth flow ([#26572](https://github.com/raycast/extensions/issues/26572))
- Fix Google Meet link creation by generating unique conference request IDs ([#27788](https://github.com/raycast/extensions/issues/27788#issuecomment-4419054403))
- Fix event duration parsing for shorthand values like `1h`, `30m`, and plain minute values ([#27788](https://github.com/raycast/extensions/issues/27788#issuecomment-4419054403))
- Validate attendee email input when creating, editing, and checking availability for events
- Fix "Next Week" event grouping to use the next calendar week ([#25595](https://github.com/raycast/extensions/issues/25595))

## [1.4.2] - 2026-04-09

- Fix timezone offset calculation for half-hour timezones (e.g. IST +05:30) that caused events to be scheduled one hour off

## [1.4.1] - 2026-02-13

- Add new command: create-quick-event – create Google Calendar events using a rule-based natural language parser (no AI setup required)

## [1.4.0] - 2026-01-28

- Added options to set default calendar, attendees, description, event duration, and send invitations

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

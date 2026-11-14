# Changelog

## [Fix Create Event and Create Task Dates] - 2026-10-13

- Fix "Could not parse startDate" when creating an event or a task with a due time: timed dates are now sent as local `YYYY-MM-DDTHH:mm:ss`, without the UTC offset BusyCal rejects ([#30119](https://github.com/raycast/extensions/issues/30119), [#30103](https://github.com/raycast/extensions/issues/30103))

## [Initial Release] - 2026-06-04

- Initial public release of the BusyCal Raycast extension
- Add structured event and task creation commands
- Add natural-language quick add commands for events and tasks
- Add item search, upcoming items, availability lookup, and reveal support

# Capacities Changelog

## [Version 2.0.1] - 2026-01-09

- Fix: Space selection for task, weblink and save to daily note.

## [Version 2.0.0] - 2025-12-16

- Offline support: The Raycast extension now communicates with the Capacities desktop app via a communication token. This means you can use the extension even if you're offline.
- Create Task: You can now create tasks in Capacities from Raycast.
- Search Details: The search results now show the details of the content in a more readable format.
- Better Open Behavior: "Open in App" as default action for opening content in Capacities, "Open in Browser" as fallback action.

## [Maintenance + Windows Support] - 2025-11-07

- add Windows Support (no App actions) (ref: [Issue #21353](https://github.com/raycast/extensions/issues/21353), [Issue #22647](https://github.com/raycast/extensions/issues/22647))
- in `Create Weblink` toasts show progress
- in `Save Daily Note` toasts show progress
- chore: replace axios with fetch
- modernize to use latest configuration

## [Enhancements] - 2024-10-25

- in `Save Daily Note` you can choose whether to append timestamp or not
- in `Save Daily Note` show Error view when Store fails to load
- in `Search Content` show Error view when Store fails to load

## [Initial Version] - 2024-02-27

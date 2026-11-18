# Memory Machine Changelog

## [Rebrand to Memory Machine] - {PR_MERGE_DATE}

- Renamed Orbit to Memory Machine, including the extension identifier (`orbit` → `memory-machine`) and AI mention (`@orbit` → `@memory-machine`).
- Changed app deep links to `memorymachine://` and renamed command and tool identifiers to use `memory-machine`.

- Check for the Mac app before opening deep links, with installation guidance and a retry action when it is missing.

- Renamed Open Timeline to Open History (`memorymachine://history`) and Search in History to Open Search (`memorymachine://search`).

- Updated search guidance and Raycast AI queries to use the desktop app's `app:` filters. For example, `app:Slack` replaces `@Slack`, and `app:(Chrome OR Safari)` searches either app.

## [Initial Version] - {PR_MERGE_DATE}

- Added AI extension tools:
  - Search Memory Machine: Opens Memory Machine Search with a provided query.
  - Open Memory Machine Timeline: Opens the Memory Machine timeline, optionally jumping to a specified date or time.
  - Open Memory Machine Settings: Opens Memory Machine settings.
- Added commands:
  - Search Memory Machine: Opens Memory Machine Search with the exact query.
  - Open Timeline: Opens the Memory Machine timeline, optionally jumping to a specified date or time.
  - Open Settings: Opens Memory Machine settings.

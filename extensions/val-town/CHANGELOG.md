# Val Town Changelog

## [Windows support] - 2026-08-23

- Runs on Raycast for Windows as well as macOS

## [Rewrite] - 2026-08-22

Rebuilt around one command and an allow list: browse your vals, and allow Raycast AI to run the ones you choose.

### Added

- Search Vals: your vals with a detail pane per val — README, access, agent settings — and its files, logs, traces, schedules, history, SQLite and blobs
- An allow list for Raycast AI. Configure a val (description, entrypoint, arguments as a JSON Schema, ask-before-running) and it joins on save; disable and re-enable per val
- Raycast AI can draft a val's argument schema by reading its code (`⌘G`)
- Six AI capabilities: list allowed vals, run one, read a val's source, read its blobs, check its recent runs and failures, and load one of your own Val Town skills
- Change a val's code visibility from Raycast

### Changed

- Talks to Val Town's MCP endpoint over plain HTTP, which is the only place logs, traces, blobs and skills are exposed
- How to call a val lives in that val's own blob storage, so it follows forks and machines; the allow list lives in account-global blob storage
- Updated to `@raycast/api` 2.x and dropped `node-fetch` and `date-fns`

### Removed

- Running vals with arbitrary arguments from a form, searching other people's vals, likes and references. Val Town's own site is better at all of these

## [Added Val Town] - 2023-10-16

Initial version code

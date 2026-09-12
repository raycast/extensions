# Numi Changelog

## [Fix History, Modernize Toolchain and Add AI Support] - 2026-08-27

- Fixed query history: entries no longer duplicate, reorder themselves on every keystroke, or drop the most recent queries when the limit is reached
- History now persists in LocalStorage instead of the evictable cache, and existing history is migrated automatically
- Added history actions: reuse a query, delete a single entry, and clear the whole history
- History entries now show when they were run
- Typing a query no longer saves it word by word: nothing is recorded until you stop typing, and finishing a query replaces the partial one it was built from
- Fixed overlapping history changes overwriting each other: deleting several entries quickly no longer brings the first one back, and clearing the history no longer restores it if a query was being saved at the time
- Fixed queries failing until the next status check when numi-cli is moved or uninstalled while the command is open
- Fixed results being returned with a leading space
- Fixed the "Numi is not running" state never clearing once Numi was started again
- Fixed the installation check firing on every keystroke
- Fixed launch arguments being overwritten by an empty query, which also makes the command usable as a Raycast fallback command
- Numi CLI is now located automatically, including on Intel Macs; the path preference is an optional override
- **Deprecated the Numi app API backend.** Numi 3.34 does not serve the `localhost:15055` API even with `Enable Alfred Integration` checked, so `Use numi-cli` is now the default. Install it with `brew install nikolaeu/numi/numi-cli`. The old backend still works if you run an older Numi build and uncheck the preference
- Replaced the unhelpful bare "Error" shown when the Numi app API is unreachable with a message that explains what to do
- Queries are now passed to numi-cli as an argument instead of through a shell
- Added a `Calculate with Numi` AI tool
- Requests to the Numi API now time out instead of hanging
- Updated to Raycast API 2.0 and refreshed the whole toolchain

## [Enhance Query on Numi] - 2023-03-13

- Supporting argument calls
- Supporting history

## [Initial Version] - 2022-07-14

- Add support to query Numi.

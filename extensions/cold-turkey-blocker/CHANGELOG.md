# Changelog

## [Initial Release] - 2026-08-04

- Removed the separate **Stop with Password** action from enabled blocks.
- The normal stop action now attempts `-stop` first and opens the password form only when Cold Turkey reports `Invalid number of parameters to unlock password lock.`
- Incorrect passwords are now shown as an inline form error so the password can be corrected and submitted again.
- Renamed the root command to **Manage Cold Turkey**, kept diagnostics inside that command, and added an **Open Cold Turkey** action.
- Confirmed direct device schedule starts, relaxed password argument handling, and made CLI parsing more defensive.

## 1.3.2 — 2026-06-24

- Expanded **Create Block** so Website & App blocks can be seeded immediately with optional website/pattern and exception lists.
- Leaving both initial-content fields empty still creates a normal empty block; device-block creation remains definition-only.
- Creation now verifies that the block exists before adding entries, then processes entries sequentially through the same serialized CLI queue.
- Added shared multiline-entry parsing, duplicate removal, count summaries, partial-failure reporting, and regression tests for the create-and-seed workflow.
- The v1.3.2 upgrade script removes the superseded v1.3.1 migration script in addition to the earlier obsolete files and macOS metadata.

## 1.3.1 — 2026-06-24

- Restored **Start Unlocked (No Lock)** to the complete **Start Options** form while retaining it as the fast primary action.
- Renamed the disabled-block primary actions to **Start Unlocked** and **Enable Device Schedule (No Lock)** so the no-lock behavior is visible before execution.
- Unlocked starts bypass the lock-confirmation prompt; saved-settings and locking modes retain the safety confirmation.
- Added an exact obsolete-file cleanup list and a v1.3.1 upgrade script that removes superseded command entry files, prior migration scripts, the old UX audit, and macOS archive metadata.
- Updated regression tests to require the unlocked mode in both the direct and full-form paths.

## 1.3.0 — 2026-06-24

- Consolidated the default command surface around **Manage Blocks**; **CLI Diagnostics** remains available but disabled by default.
- Removed the standalone Start, Add, Create, and Break commands from the manifest because their workflows are already available contextually from a selected block.
- Replaced nested start, website/exception, and break submenus with one focused form action for each option family.
- Removed the search-bar dropdown entirely; native search now matches block names, states, and block-type keywords. Added Root Search keywords for the intents formerly represented by standalone commands.
- Removed Toggle, raw-status copying, block-name copying, and routine Preferences actions from block and form Action Panels.
- Kept the first two actions strictly contextual: Enter starts, stops, or refreshes; Command–Enter opens Start Options, password stopping, or read-only diagnostics. The direct unlocked start was not duplicated inside Start Options. Version 1.3.1 reverses that choice so the complete form exposes every supported start mode.
- Removed the second refresh entry from unknown-status Action Panels; the contextual Refresh Status action is the only refresh path shown there.
- Removed the duplicate Refresh action from unknown-status block panels.
- Added regression tests for the simplified root command and Action Panel surfaces.

## 1.2.0 — 2026-06-24

- Reworked **Manage Blocks** around Raycast's primary/secondary action model so each known block state exposes only relevant top-level actions.
- Disabled blocks now lead with Start and Start as Configured; enabled blocks lead with Stop and Stop with Password.
- Unknown states now lead with Refresh Status and move explicit start, stop, lock, and toggle commands into a safety-oriented submenu.
- Collapsed website/exception editing and break controls into focused submenus, while preserving Create, Refresh, Preferences, and copy actions in semantic sections.
- Simplified the search-bar dropdown to block type because status is already represented by stable Enabled, Disabled, and Unknown sections.
- Added a filtered-empty state with a one-keystroke reset to All Blocks.
- Added a locking-only start form when launched from a block action, avoiding duplicate unlocked and saved-settings choices.
- Added menu-policy regression tests and preserved section ordering during Raycast's built-in filtering.

## 1.1.0 — 2026-06-21

- Fixed Cold Turkey 4.9 block-list parsing so `Website & App Blocks` and `Device Blocks` are section headers rather than phantom blocks.
- Added typed Website & App and Device block handling, valid-action filtering, and clearer device-start semantics.
- Serialized every native CLI process and changed status loading to list first, then query each block sequentially.
- Added retrying state verification after start, stop, password-stop, and toggle actions.
- Added block-list verification after creation and a duplicate-name preflight check.
- Added semantic handling for `Error:` output even when the process exit code is successful.
- Added UTF-16LE output decoding for Windows CLI compatibility.
- Reworked CLI Diagnostics into a safe, read-only block/status report.
- Clarified that `-status` does not expose lock details and that random-text break controls do not remove random-text block locks.
- Added Cold Turkey 4.9 parser fixtures and output-decoding tests.

## 1.0.0 — 2026-06-21

- Added cross-platform macOS and Windows manifests and executable defaults.
- Added block listing with per-block status and contextual actions.
- Added all start modes, including `-as-is`, timed, password, and random-text locks.
- Added password-based stopping, website/exception entry, block creation, device-block creation, and break controls.
- Added confirmation prompts for potentially locking actions and a diagnostics command.
- Added defensive CLI-output parsing, unit tests, and production build configuration.

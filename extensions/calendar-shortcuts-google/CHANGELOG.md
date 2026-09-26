# Changelog

## Unreleased

- Removed **Check Google Calendar Connection** from Raycast Root Search. Connection diagnostics remain available contextually from DayCal error states without exposing a standalone support command.
- Removed development-only **Refresh Diagnostics**, **Test Quick Add Parsing**, and **Replay Calendar Setup** commands from the public Raycast manifest ahead of Store submission. Their source and regression tooling remain available for development.
- Removed the internal **Event Actions** helper from Raycast Root Search. Menu Bar event actions now route through **Schedule** with event context, while the shared Event Actions views remain internal and reusable.
- Polished **Calendar Settings** so its Action Panel uses Raycast-style **Configure Extension** wording with the `⌥⌘,` extension-preferences shortcut.

## 0.17.0 Public Beta — 2026-09-18

- Google OAuth verification for the sensitive `calendar.events` scope was approved, and a fresh-account runtime test completed without Google’s unverified-app warning.
- Fixed Edit Event saving so supported edits submit reliably and persist from the tested Schedule and Menu Bar flows.
- Hardened **Disconnect Google Account → Delete DayCal Settings** so it removes both current account-scoped setup data and historical v1 setup keys, verifies the deletion before signing out, and no longer allows old routing keywords such as `jonah` to reappear after reconnecting.
- Fixed first-save verification for routing keywords by comparing the same trimmed, lowercased, deduplicated form that DayCal persists.
- Reworked Disconnect Google Account into an explicit keep-or-delete flow. Users can preserve account-scoped DayCal calendar setup for a later reconnect or delete it for a true fresh-account setup; both paths clear stale Menu Bar event state, and neither deletes Google Calendar events or revokes the Google Account grant.
- Renamed extension display text, manifest branding, icons and current documentation to DayCal. Existing command identifiers, account-scoped storage, OAuth configuration and repository URLs are unchanged.
- Replaced the website Schedule mockup with a real demo screenshot, added the Menu Bar screenshot, and added a shared enlargement overlay with close, Escape and backdrop dismissal. The Menu Bar capture shows the renamed DayCal interface.
- Updated public documentation and support contact details for the verified DayCal beta, including `support@daycal.co.uk`.

## 0.15.0 Public Beta Candidate — 2026-09-13

- Added the DayCal static website, privacy and security pages in `docs/` for free GitHub Pages hosting at `daycal.co.uk`. Website branding introduces DayCal without renaming the repository or changing extension behaviour, OAuth or compatibility identifiers.
- Explicit first-run Calendar Menu Bar launches now open Set Up Calendars for incomplete accounts. Background launches stay quiet and retain the setup action, without polling or repeated automatic redirect attempts. Schedule first-run routing is unchanged.
- Promoted Copy to Calendar into the Menu Bar transfer slot for ordinary writable recurring events, preserving supported one-off Move actions and existing meeting/location shortcuts. More Actions omits Copy only when promoted; recurring-event Move support was not added.
- Added regression coverage for Menu Bar setup launch modes, stale setup snapshots, redirect failures, event submenu permissions and Move/Copy placement. Both UX improvements were locally runtime-verified by the maintainer.
- Fixed and verified setup persistence, including changed selections, routing keywords, and intentional clearing.
- Serialized LocalStorage writes to prevent partial setup saves.
- Open Event now opens account-aware event links in the default browser.
- Open Calendar now opens the connected account’s calendar view in the default browser.
- Removed the unused app-opening preference.
- Corrected display of multi-day all-day events that are active today.
- Compacted and truncated long menu-bar event titles cleanly.
- Refined Smart Status wording to describe only the filtered, visible view.
- Added menu-row and event-opening regression tests.

## 0.14.0 Beta Candidate — 2026-09-11

First public GitHub beta candidate.

Highlights include:

- Native Google OAuth through Raycast
- Schedule and persistent Menu Bar
- Guided first-run calendar setup
- Account-scoped role mappings and calendar selections
- Timed and true all-day Quick Add
- Safe timed and all-day event editing
- Move / Copy / Delete permission handling
- Automatic Schedule/Menu Bar refresh wiring
- Runtime refresh diagnostics
- Consistent, filtered-view-aware Smart Status
- Safer Start/End DatePicker handling

Earlier development versions were private recovery/stabilisation checkpoints and are intentionally not reproduced as public release history.

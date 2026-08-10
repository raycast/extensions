# Helium Changelog

## [Bookmarks Without a Running Browser] - 2026-07-23

- Read bookmarks directly from the Helium profile's `Bookmarks` file instead of AppleScript, so Search Bookmarks works while Helium is closed, loads faster, and includes arbitrarily nested folders as full `Parent/Child` paths.
- Prefer the last used Helium profile when several profiles exist, so profile-based commands read from the profile you actually use.

## [Reliability, Search Provider, and Bangs] - 2026-07-06

- Speed up Search Tabs by batching Helium AppleScript tab property reads and keeping Browser Extension favicon enrichment non-blocking.
- Show cached tab snapshots immediately in Search Tabs while Helium refreshes in the background.
- Keep optimistically closed tabs tombstoned until Helium stops reporting them, including deduplicate partial-failure handling.
- Split browsing history into a dedicated Search History command, leaving Search Web focused on bangs and provider-backed web results.
- Make history tolerate missing Helium databases and mirror Helium's search provider/bang settings from the local profile where safe.
- Add Raycast-side resolution for Helium's official bang list, plus Vitest coverage and a read-only tab enumeration benchmark.
- Open new Helium tabs/windows through AppleScript and close Raycast only after Helium confirms success.

## [Fix Optimistic Tab Closing] - 2026-04-27

- Use the stable Helium tab id for list identity and optimistic updates so quickly closing tabs no longer removes the wrong rows or mixes up favicons.
- Rework tab close and deduplicate actions to keep pending closes hidden until Helium confirms the close, then refresh Search Tabs and Search Web from the latest tab state.

## [Fix Search Tab Switching] - 2026-04-25

- AppleScript to switch tabs was not running due to `closeMainWindow()` in actions.tsx killing the process before. Fix was to move `closeMainWindow()` to **after** the AppleScript succeeds.
- Removed experimental open/close-tab workaround for cross-Space switching. Tab switching now uses the `select` AppleScript command added upstream in [helium-macos#126](https://github.com/imputnet/helium-macos/pull/126), which natively switches to the Space the Helium window lives on and focuses the matching tab. Requires a Helium build that includes that patch.

## [Initial Version] - 2025-10-30

# Helium Changelog

## [Windows Support] - 2026-08-10

- Add Windows support: Search Web, Search History, Search Bookmarks, and the new tab/window/incognito commands work against [Helium for Windows](https://github.com/imputnet/helium-windows), located via the standard install roots, the path registered by Helium's installer, or the new "Helium Location" preference for portable builds.
- Read Helium's profile (bookmarks, history, search provider, bangs) from the Windows `User Data` root, and drive new tabs and windows through Helium's command line since Chromium has no scripting interface on Windows.
- Source Search Tabs from Raycast's browser extension on Windows. Selecting a tab focuses it through the Windows accessibility tree instead of reopening the URL as a duplicate, falling back to opening the URL when the tab's title no longer matches. Closing and deduplicating tabs have no Windows equivalent and are hidden instead of failing.
- Declare every keyboard shortcut per platform so actions stay reachable with `Ctrl`/`Alt` on Windows, and align Search History's "Copy as Markdown" with the rest of the extension (`⌘⌥C` / `Ctrl+Alt+C`).
- Fix Open New Tab landing on an `ERR_INVALID_URL` page on macOS: Chromium refuses AppleScript-driven navigation to `chrome://` addresses, so the tab is now created without a URL and opens Helium's configured new tab page.
- Open New Tab now adds a tab to the window you last used on Windows, instead of opening a new window. Chromium's command line cannot express this — `chrome://` addresses always open a new window — so Helium is focused and sent `Ctrl+T`, falling back to the previous behavior whenever Helium isn't running or focus cannot be confirmed.
- Always open Helium against the real profile on Windows. Raycast's extension processes run with `LOCALAPPDATA` pointing at `AppData\Local\Temp`, and Chromium derives its default profile directory from that variable, so launching Helium started a stray empty profile — new-user onboarding, no history, bookmarks or sessions. Every launch now pins `--user-data-dir` to the profile the extension reads, and Helium detection no longer trusts that variable alone.

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

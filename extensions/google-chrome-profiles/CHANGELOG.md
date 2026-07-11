# Google Chrome Profiles Changelog

## [Fix] - 2026-05-26

- Fix silent failure of all profile actions (Bring to Front, New Tab, New Window, Open URL) for users who have not previously granted Raycast `AppleEvents` permission for `System Events.app`. `@raycast/utils.runAppleScript` spawns `osascript` without `detached: true`, so it inherits the extension's Node process group. Raycast tears that group down ~40ms after the action handler returns control to React, which kills `osascript` mid-flight and also cancels the asynchronous TCC permission prompt that macOS tries to render on first run, leaving no path for the user to actually grant the permission. Run AppleScript via a detached `child_process.spawn("/usr/bin/osascript", [...], { detached: true, stdio: "ignore" })` + `child.unref()` so the subprocess survives teardown, the TCC prompt renders, and the script runs to completion.
- Fix bookmark favicon crash on `chrome://` / `about:` URLs: `new URL(...).origin` is `null` for opaque-origin schemes; passing that to `getFavicon` threw `TypeError: Invalid URL` and broke the bookmarks list. Only resolve favicons for `http(s)` bookmarks; use the globe icon for everything else.

## [Feature] - 2026-04-08

- Add "New Window" action to open a new Chrome window for a profile
- Available from the profile list via `⌘ ⇧ ↵` or from within a profile's bookmarks view
- Opens directly via CLI without focusing existing windows (tiling WM friendly)

## [Feature] - 2026-03-12

- Add Google Chrome Canary support via a new Browser preference dropdown
- Show informative toast when "Open Profile with Context" is launched without a quicklink context

## [Feature] - 2026-01-23

- Bring the profile window to front instead of adding a new tab
- Simplify deeplink integration
- Improve bookmark favicon display
- Support opening chrome://, chrome-extension://, about:, and view-source: URLs from bookmarks
- Improve URL detection to directly open valid URLs

## [Refactor] - 2025-09-03

- Refactor the extension to use the new `open-profile` and `open-profile-url` commands.

## [Quicklinks] - 2024-07-29

- Add support for quicklinks to open a chosen profile in a specific url.

## [Quicklinks] - 2023-09-22

- Support quicklinks to open a chosen profile.

## [Update] - 2023-02-13

- Detect whether the input text is a URL and provide and "Go to" option if so

## [Update] - 2022-08-10

- New preference to set the URL for new blank tabs
- Removed preference to show/hide the "new tabs" section
- Enhance the "New Tab" section
- Bug fix and minor refactoring
- Migration to a newer version of the API

# Google Chrome Profiles Changelog

## [Fix] - 2026-08-27

- Fix selecting a profile bringing a *different* profile to front (e.g. selecting "Work" opened "Work admin"). For a profile signed into a Google account, Chrome's Profiles menu bar item does not show the profile's own name — it shows `${gaia_given_name} (${name})`, e.g. a profile named "Work" signed in with a Google account whose given name is "Alex" appears in the menu as "Alex (Work)". The exact-name match against the raw profile name therefore never matched a signed-in profile, and always fell through to a substring search across every menu item — which happily clicked any other profile whose name was a substring of the search text (e.g. "Work" matched "Work admin" or "old work", depending on menu order), with no visible error. Carry the profile's `gaia_given_name` on the `Profile` object itself (read once alongside the rest of the profile, and across the Quicklink/deeplink, which previously dropped it) to construct the label Chrome actually shows, and try it — then the raw profile name — as exact candidates only; drop the substring fallback entirely, since guessing the wrong profile is worse than a clear "Profile not found in menu" failure. A Quicklink created before this fix, whose deeplink still lacks the given name, falls back to a one-time `Local State` read so it keeps working.

## [Feature] - 2026-08-25

- Add a destructive action to delete a Chrome profile and its local data from the profile list.
- Allow deleting an inactive profile while Chrome remains open; the active profile must be closed first.

## [Fix] - 2026-08-12

- Fix opening a profile while Chrome is closed producing two windows: the requested profile, plus one for whichever profile was used last. The Bring to Front / New Tab / Open URL path began with `tell application "Google Chrome" to activate`, which launches Chrome with no arguments; a flagless Chrome restores every profile listed in `profile.last_active_profiles` (Local State), so the previous profile's window appeared before System Events ever clicked the Profiles menu. Branch on whether the browser is already running: when it is, the Profiles-menu click is unchanged and keeps the focus / add-a-tab / find-an-existing-tab semantics; when it is not, do a single cold start into the requested profile with `/usr/bin/open -n -a <bundle> --args --profile-directory=<dir> --new-window [url]`. `--profile-directory` is the profile a cold Chrome boots into, which is what suppresses the session restore.
- Fix the New Window action holding an `osascript` subprocess open for the browser's entire lifetime. It exec'd Chrome's inner Mach-O binary directly, so `do shell script` never returned; it now shares the `/usr/bin/open` helper above, which returns as soon as Launch Services takes the request. `BrowserConfig.binaryPath` becomes `appPath` accordingly, since `open -a` expects the `.app` bundle.

## [Fix] - 2026-07-14

- Fix profile actions still failing in the store build after the 2026-05-26 detached-spawn fix. `showHUD` was awaited *before* spawning the detached `osascript` subprocess; `showHUD` closes the main window, which starts the extension process teardown, so in the distribution build the Node process could be killed before the `spawn` call ever ran — the HUD appeared but no Chrome action happened. (Dev mode keeps the process alive, which is why this never reproduced under `npm run dev`.) Spawn the detached subprocess first, then show the HUD; skip the HUD when the spawn failed so the failure toast stays visible.

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

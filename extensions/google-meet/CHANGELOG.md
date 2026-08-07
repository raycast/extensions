# Google Meet Changelog

## [Fix Arc Detection] - 2026-08-07

- Fix meeting links never being copied in Arc, which failed by asserting the meeting had opened in Little Arc even when Little Arc was disabled. Arc's `URL of active tab` raises a `-1728` error for perfectly normal, visible windows — right after a tab opens, and whenever the active tab isn't a web page — and returns a URL again milliseconds later. The previous release treated any such error as a Little Arc signature and threw a fatal error, which aborted the entire detection window on the very first poll instead of letting the next one (300ms later) succeed. Arc also enumerates one `window` per space and those entries mirror the same active tab, so a single blip marks every window at once.
- Report an unreadable Arc window as a transient state and keep polling, and surface it only if the detection deadline expires without a single poll ever having read a URL — a lone unreadable sample, even the one crossing the deadline, proves nothing. The error now states what was actually observed ("couldn't read the meeting link from any Arc window") instead of diagnosing Little Arc, which can't be told apart from an ordinary window that never exposed a URL; Little Arc is offered as the likely cause in the recovery text. Adapters refine an expired deadline through a new optional `describeTimeout` hook, so this still beats a bare timeout.
- Mark an empty or `missing value` active-tab URL the same way as an unreadable window, keeping the number of reported entries equal to the number of windows Arc actually has. The System Events cross-check compares against that count, so silently dropping empty entries had been skewing it toward false positives too.
- Read only the active tab of each Arc/Dia window, never the full tab list. Enumerating tabs would match a stale `meet.google.com/xxx-xxxx-xxx` tab left open from an earlier meeting and copy that old link instead of the one just created.

## [Fix Browser Launch] - 2026-08-06

- Fix meetings opening in the wrong application when the chosen browser's name is a substring of another installed app's name. The creation URL was opened by passing the browser's display name to `open()`, which has to match that name back to an application — and `Dia` matches `Obsidian`, so meetings opened in Obsidian, launching it even when it wasn't running. The resolved `Application` is now passed instead, so the exact bundle is opened. The browser's name is still what selects the adapter and addresses the app in AppleScript, which needs the name macOS installs it under.

## [Fix Brave Support] - 2026-08-05

- Fix Brave being rejected with "isn't a supported browser". macOS installs Brave as `Brave Browser.app` and reports it under that name, but the supported-browser list held `Brave`, so the exact-match check added in the previous release failed for it.

## [Reliability Overhaul & PWA Support] - 2026-08-03

- Replace the fixed-delay, unbounded-recursion URL lookup with a single shared `createMeeting` pipeline used by all four commands: it polls for the generated link at a fixed interval with a hard deadline instead of guessing a one-shot sleep, and never casts a missing URL to `string`.
- Search every window (and every tab, where the browser's scripting dictionary supports it) instead of only the active tab of the front window, so a meeting opened in a background tab or a non-frontmost window is still found. Applies to Safari, Chrome and other Chromium-family browsers, and Arc/Dia.
- Validate and normalize every candidate URL (`https`, `meet.google.com`, a real generated meeting code) before copying it, rejecting `/new` and unrelated Meet pages instead of trusting anything containing the text `meet.google.com`.
- Replace the previous "everything is a clipboard error" catch-all with typed, actionable errors (e.g. missing Automation/Accessibility permission, unsupported browser, meeting URL timeout, invalid URL, PWA not installed) shown with recovery instructions; the raw AppleScript error is still logged for development, never shown as the headline message. A failure after the link is already copied (refocus, or opening the PWA) is never reported as if nothing was copied.
- Add an actionable, specific error for Arc's "Air Traffic Control" routing a meeting into a Little Arc window, instead of a generic timeout or a misleading clipboard failure, since Little Arc doesn't expose its URL through Arc's normal scripting interface.
- Add an "Open Meetings In" preference to open meetings in the installed Google Meet PWA. The link is still resolved and copied through a real, scriptable browser first (PWA wrapper apps aren't reliably scriptable across Chrome/Edge/Brave), then opened in the PWA as a convenience; failing to open the PWA never prevents the link from being copied.
- Reinterpret the timeout preference as an overall detection deadline (default raised from 500ms to 8 seconds) rather than a single fixed sleep before one lookup attempt; out-of-range values are clamped instead of silently misbehaving.
- Preserve the clipboard's previous contents when using Firefox's keyboard-driven fallback, restoring them if meeting creation ultimately fails instead of leaving an intermediate URL behind.

## [New Command & Bug Fix] - 2026-04-28

- Add "Create Meet and Refocus with Specified Profile" command — creates a meeting using a selected profile, copies the link, and refocuses the previous app
- A refocus failure (e.g. the keystroke can't be sent) no longer reports a clipboard failure when the link was already copied. Also aligned the profile-list failure toast with the one used by the refocus command for consistency.
- Fix "Couldn't copy to clipboard" error on Dia browser. Dia's AppleScript dictionary rejects the flat `active tab of front window` form used for most Chromium browsers and throws a coercion error. Route Dia through the nested `tell front window` form (previously only used for Arc). Both browsers are from The Browser Company and share the same scripting quirk.
- Fix frontmost-browser detection. The previous `lsappinfo metainfo | grep` approach returned the first supported-browser name found anywhere in the metadata dump, so a background Chrome process or an Electron app whose bundle path contains "Google Chrome Framework" would be reported as the frontmost browser even when a different browser was actually in use. Replaced with a System Events query for the actual frontmost process name.

## [New Command] - 2026-04-12

- Add "Create Meet and Refocus" command that creates a meeting, copies the link, and switches back to your previous app
- Add Dia browser support

## [Improvement] - 2026-02-13

- Make delay configurable by user
- Add support for Zen Browser

## [Improvement] - 2024-10-22

- Add delay before reading meeting URL from browser

## [Improvement] - 2024-07-19

- Change the way to get the URL in some Chromium-based browsers

## [Improvement] - 2024-05-29

- Change the way to get the URL in Arc Browser

## [Bug fix] - 2024-01-05

- Open Arc's location bar before attempting to copy the URL

## [New Preference] - 2023-07-31

- Now it's possible to select a preferred browser, meaning that if you have multiple browsers and want to customize whether it opens on default application or a custom. By default it will always open with the default browser, but you can now override the value on preferences. Don't forget to only choose valid browsers.

FYI: For some reason, as of now, Vivaldi is not being able to be selected, even thought is a valid browser

## [Bug fix] - 2023-07-29

- Sometimes when trying to copy from a browser it didn't copy and also got stuck on `Creating meet...` on Raycast, specially on Firefox and Firefox Developer Edition.
- Copy url now works on Arc Browser as expected. It's also good to point out that it uses the native and default way to copy the URL from the browser using the `cmd + shift + c` combination, for now it only will work with this combination since it's the default one and should be the most used accross users.

## [New Commands] - 2022-10-21

Now it's possible to create multiple profiles and select one of them to start a new google meet call

## [New Additions] - 2022-09-07

When the meet is created, it will copy the generated url to the clipboard. (Not all browsers are supported)

## [Added Google Meet] - 2022-03-06

Initial version code

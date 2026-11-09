# Clipboard Type Changelog

## [Privacy, Speed, and Reliability Improvements] - 2026-11-06

- The progress toast no longer shows a preview of the clipboard contents.
- Fixed Windows-style line endings (`\r\n`) being typed as two newlines.
- Fixed the typed text sometimes differing from the clipboard text that was read when the command started.
- Clipboard text is no longer passed as a process argument, so other processes can't see it.
- Errors now update the progress toast instead of showing a second one.
- Renamed Human Cadence Speed to Typing Speed. Your selected speed is kept, and it now applies whether Human Cadence is on or off.
- Human Cadence now randomly varies the pause between keystrokes around the selected speed instead of adding extra delay on top of it, so turning it on or off no longer changes how fast text is typed.
- Typing Speed options now show the approximate time per key.
- Fast, Very Fast, and Super Human now type much faster. Previously, every speed waited at least 100 ms per key.
- Shifted characters are now marked as Shift-pressed on the key event itself, so capitals and symbols register reliably at fast speeds.
- Added ways to stop typing early: press Esc, click Stop on the progress toast, or switch to another app.
- Missing Device Control and Data Access (Accessibility before macOS 27) or Automation permission now shows a clear error with a button to open the right System Settings pane. Previously, typing could silently do nothing and still report success.
- Updated the README with permission setup and current preferences.

## [Improved typing reliability and feedback] - 2026-07-14

- Added physical CoreGraphics key events for uppercase letters and symbols, improving compatibility with browser-based remote consoles.
- Added a non-activating progress toast with a live remaining-character count and completion state.

## [Fixed timeout for long text] - 2026-03-25

- Disabled the default 10s AppleScript timeout which caused typing to fail for long clipboard content with human cadence enabled.

## [Added soft newlines preference] - 2026-03-23

- Added a new preference to use Shift+Enter for newlines instead of Enter. Useful for apps and websites that treat Enter as submit.

## [Added human cadence typing] - 2026-02-10

- Added a new preference to enable human cadence typing, which simulates more natural typing by introducing random delays between keystrokes.

## [Initial Version] - 2025-12-16

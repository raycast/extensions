# Clipboard Type Changelog

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

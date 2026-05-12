# Keystroke Visualizer Extension Changelog

## [Fixes] - 2026-05-12

- Fixed helper startup failures after installing the extension ([#27817](https://github.com/raycast/extensions/issues/27817)).
- Fixed cases where toggling the overlay off could leave the helper process running.
- Added checks for the packaged helper binary so missing or non-executable helper files now show a clear error.
- Improved helper launch behavior by starting the native helper directly instead of through a shell command.
- Added HyperKey display support so Hyper shortcuts render as ✦ in the overlay.

## [Initial Release] - 2026-05-11

- Shows keystrokes on screen with floating overlay pills.
- Supports three display modes: All Keys, All Modified Keys, and Command Keys Only.
- Visualizes mouse clicks (modifier+clicks and right-clicks).
- Supports multiple monitors and follows the cursor across screens.
- Includes appearance themes: Dark, Light, Auto, and Liquid Glass (macOS 26+).
- Offers six overlay positions (top/bottom, left/center/right).
- Lets you adjust display duration from 0.5s to 5.0s.
- Supports international keyboard layouts for correct character display.
- Groups keystrokes into smart pills (typing collapses continuously while shortcuts get their own pills).
- Recovers the event tap automatically under heavy system load.
- Ships a native Swift helper binary built for arm64 and x86_64.

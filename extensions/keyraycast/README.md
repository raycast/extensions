# Keyraycast

Show keystrokes on screen. A modern [KeyCastr](https://github.com/keycastr/keycastr) alternative as a Raycast extension.

Great for screen recordings, live demos, presentations, and bug reports.

![Liquid Glass on macOS 26](metadata/keyraycast-3.png)

## Features

- **Three display modes** - All Keys, All Modified Keys, or Command Keys Only
- **Mouse click visualization** - Shows modifier+clicks and right-clicks
- **Multi-monitor support** - Overlay follows your cursor across screens
- **Appearance themes** - Dark, Light, Auto (match system), or Liquid Glass (macOS 26+)
- **Configurable position** - Six positions (top/bottom, left/center/right)
- **Adjustable timing** - Display duration from 0.5s to 5.0s
- **International keyboard support** - Correct character display for all layouts
- **Smart pill grouping** - Continuous typing collapses into one pill, shortcuts get their own

## Setup

1. Install the extension from the Raycast Store
2. Run **Toggle Keystroke Overlay** from Raycast
3. Grant **Accessibility** permission when prompted (System Settings > Privacy & Security > Accessibility)
4. Toggle again to start the overlay

### Accessibility Permission

Keyraycast uses a macOS CGEventTap to capture keystrokes. This requires Accessibility permission. The first time you run it, macOS will prompt you to grant access. If the overlay doesn't appear, check System Settings > Privacy & Security > Accessibility and make sure Raycast (or the KeyraycastHelper) is enabled.

## Settings

Change settings in Raycast preferences. Toggle the overlay off then on to apply changes.

| Setting | Options | Default |
|---------|---------|---------|
| Display Mode | All Keys, All Modified Keys, Command Keys Only | All Keys |
| Display Duration | 0.5s, 1.0s, 1.5s, 2.0s, 3.0s, 5.0s | 2.0s |
| Appearance | Auto, Glass (macOS 26+), Dark, Light | Auto |
| Font Size | Extra Small, Small, Medium, Large, Extra Large | Medium |
| Position | Bottom/Top + Center/Left/Right | Bottom Center |
| Force Uppercase | On/Off | Off |
| Show Space Symbol | On/Off | On |
| Show Mouse Clicks | On/Off | Off |

## Preview

![Keyraycast in Raycast](metadata/keyraycast-1.png)
*Toggle command in Raycast*

![Light theme](metadata/keyraycast-2.png)
*Typed text with light theme*

![Glass theme](metadata/keyraycast-3.png)
*Liquid Glass on macOS 26*

![Dark theme](metadata/keyraycast-4.png)
*Shortcuts with dark theme*

## How It Works

The Raycast extension launches a native Swift helper binary that runs independently in the background. The helper captures keystrokes via CGEventTap and displays them in a floating overlay window. Toggling off sends SIGTERM to the helper process.

The helper binary is a universal (arm64 + x86_64) macOS binary included in the extension assets. Full source code is in `sources/keyraycast-helper/` and can be rebuilt with `npm run build-swift`.

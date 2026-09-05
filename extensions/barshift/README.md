# BarShift

BarShift is a Raycast extension for switching macOS **Automatically hide and show the menu bar** between two configurable modes. It applies changes directly, including to already-fullscreen AppKit spaces, without opening System Settings or requiring Accessibility permission.

## Features

- Configure any two menu-bar visibility modes and toggle them with one command.
- Select any one of the four modes directly from a searchable Raycast list.
- Refresh already-fullscreen spaces using a deterministic four-state pulse.
- Display the current mode directly in Raycast root search.
- Pick up manual System Settings changes with a read-only background refresh.
- Avoid controlling System Settings through UI automation.

## Compared to Toggle Menu Bar

The Store already has [Toggle Menu Bar](https://www.raycast.com/iamyeizi/toggle-menu-bar), which also switches between two of the four macOS options. BarShift differs in how it applies the change and in what it adds around it:

- **Mechanism.** Toggle Menu Bar drives the System Settings UI with a System Events AppleScript, so Raycast needs the Automation permission. BarShift writes the underlying preferences and posts the matching WindowServer and AppKit notifications, so no Automation permission is involved.
- **Already-fullscreen spaces.** BarShift also pulses through the four modes so an AppKit fullscreen space that is already open picks up the new setting. This is best-effort; see [Limitations](#limitations).
- **Direct mode selection.** Alongside the two-mode toggle, BarShift adds a second command with a searchable list of all four modes.
- **Status display.** BarShift shows the current mode in Raycast root search and refreshes it after changes made manually in System Settings.

If a two-mode toggle is all that is needed, either extension covers it.

## Modes

Both **First Mode** and **Second Mode** are command preferences and offer all four macOS choices:

- Always
- On Desktop Only
- In Full Screen Only
- Never

The defaults are **Never** and **In Full Screen Only**.

## Commands

- **Toggle Menu Bar Mode** switches between the two modes configured in its command preferences.
- **Set Menu Bar Mode** shows all four choices, marks the active mode, and applies the selected one directly.

Raycast's root search subtitle shows the last observed mode, such as **Current: Never**. It updates immediately after either command runs. The toggle command's read-only one-minute background refresh also picks up changes made in System Settings.

## How It Works

The command uses a small native helper to mirror the macOS settings pane: it writes and synchronizes the two real global preferences, updates WindowServer directly, keeps the four-state Control Center value in sync, and posts the corresponding distributed notifications. To refresh an already-fullscreen app, it traverses all four modes in Gray-code order before settling on the requested one. Each notified step changes exactly one real preference, deterministically reproducing the manual multi-click workaround without opening System Settings. It does not need Accessibility permission. Set `MENU_BAR_PULSE_STEP_MS` to `20`–`1000` to override the default 60 ms delay between pulse steps.

The WindowServer update uses the same private SkyLight function called by the macOS Menu Bar settings pane. Its Objective-C source is included in [`native/menu-bar-auto-hide-native.m`](native/menu-bar-auto-hide-native.m), and `npm run build:native` produces a signed universal binary for Apple Silicon and Intel.

## Limitations

Some video players and browser HTML5 fullscreen windows manage their own menu-bar presentation instead of using an AppKit fullscreen space. The pulse is therefore best-effort: macOS does not provide a way for another process to override those apps live, so the selected setting may apply only after leaving and re-entering fullscreen.

## Compatibility

- Tested on macOS 26.6 (build 25G72).
- The native helper is built as a universal executable for Apple Silicon and Intel Macs with a macOS 13 deployment target.
- BarShift relies on a private SkyLight function also used by System Settings. Apple can change private APIs between macOS releases, so new major versions should be tested before being listed as supported.

## Development

```bash
npm install
npm run lint
npm run build
```

# Toggle Menu Bar

Switch macOS **Automatically hide and show the menu bar** between two preferred options, or select a mode directly.

## Commands and preferences

- **Toggle Menu Bar** switches from option 1 to option 2; any other current mode switches to option 1. Selecting the same option for both preferences applies that mode.
- **Set Menu Bar Mode** shows all four modes and highlights the current one. The picker stays open until you choose a mode.

The extension starts with **Always** for option 1, **In Full Screen Only** for option 2, and **Close Raycast window** disabled. When **Close Raycast window** is enabled, the toggle closes Raycast on invocation before applying the mode, preserving its existing behavior even if the change fails. The picker closes only after a successful selection. When disabled, both commands use toasts and leave Raycast open.

| Mode                | Desktop   | Full screen |
| ------------------- | --------- | ----------- |
| Always              | Auto-hide | Auto-hide   |
| On Desktop Only     | Auto-hide | Visible     |
| In Full Screen Only | Visible   | Auto-hide   |
| Never               | Visible   | Visible     |

The toggle command's subtitle shows the last confirmed mode. A read-only background refresh runs at Raycast's one-minute interval to pick up changes made in System Settings. It only reads status and updates the subtitle: it does not read extension preferences, change the menu bar, show toasts, or close windows. Failed reads clear the subtitle to **Current: Unknown**.

## Native implementation

A bundled shell wrapper forwards `status`, `set`, and `toggle` to a signed universal Objective-C helper. The helper holds an exclusive kernel `flock` across each mutation's read, target choice, and pulse; status reads take a shared lock and wait for a pulse to finish. Locks are released automatically if a process dies. The helper synchronizes the global preferences and Control Center selection, updates WindowServer through the private SkyLight API, and posts refresh notifications. It briefly traverses all four modes to refresh already-open AppKit full-screen spaces, then restores the requested mode and validates the final preferences before reporting success. On a failed intermediate write it makes a best-effort restoration to the requested mode and reports failure.

No AppleScript, Automation permission, Accessibility permission, or System Settings UI control is required. Source for the helper is included under `native/`. `npm run build:native` rebuilds and ad-hoc signs an executable containing both arm64 and x86_64, with a macOS 13 deployment target. Building requires Apple's command line developer tools; the shipped helper is ready to use.

## Limitations

Private APIs can change between macOS versions. Live refresh is best-effort: some video players and browser HTML5 full-screen windows control their own menu bar presentation. Leave and re-enter full screen if such an app does not reflect the new setting. Final preference validation confirms the selected system mode, not the appearance of every application's full-screen space. The pulse may briefly change menu bar visibility while it applies the setting.

## Development

```sh
npm ci
npm run lint
npm run typecheck
npm test
npm run build
```

Tests replace Raycast and native execution with isolated fixtures; they do not change the host menu bar. Production builds rebuild and sign the native helper. Real Raycast behavior and full-screen appearance require manual verification on macOS.

Originally created by **iamyeizi**, retaining the original extension icon and MIT license. Native controls and the mode picker contributed by **0xAdriaTorralba**.

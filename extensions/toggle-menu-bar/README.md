# Toggle Menu Bar

Switch macOS **Automatically hide and show the menu bar** between two preferred options, or select a mode directly.

## Commands and preferences

- **Toggle Menu Bar** switches from option 1 to option 2; any other current mode switches to option 1. Selecting the same option for both preferences applies that mode.
- **Set Menu Bar Mode** shows all four modes and highlights the current one. The picker stays open until you choose a mode.

The extension preferences retain their existing defaults: **Always** for option 1, **In Full Screen Only** for option 2, and **Close Raycast window** disabled. Existing saved preferences and the toggle command's hotkey or alias continue to work. When **Close Raycast window** is enabled, the toggle closes Raycast on invocation before applying the mode, preserving its existing behavior even if the change fails, and the picker closes after a successful selection. When disabled, the commands do not close the window themselves. macOS often deactivates Raycast while the menu bar setting changes, so the window usually closes on its own and the confirmation appears as a toast.

| Mode                | Desktop   | Full screen |
| ------------------- | --------- | ----------- |
| Always              | Auto-hide | Auto-hide   |
| On Desktop Only     | Auto-hide | Visible     |
| In Full Screen Only | Visible   | Auto-hide   |
| Never               | Visible   | Visible     |

The toggle command's subtitle shows the last confirmed mode. A read-only background refresh runs at Raycast's one-minute interval to pick up changes made in System Settings. It only reads status and updates the subtitle: it does not read extension preferences, change the menu bar, show toasts, or close windows. Failed reads clear the subtitle to **Current: Unknown**.

## How it works

The commands call a small Swift helper that Raycast builds with the extension. It writes the two global menu bar preferences, keeps the Control Center selection in sync, updates WindowServer through the private SkyLight API, and posts the refresh notifications macOS uses for this setting. It briefly steps through all four modes so already-open AppKit full-screen spaces pick up the change, then applies the requested mode and checks that macOS kept it before reporting success. Changes are serialized, so quick repeated toggles run one after another.

No AppleScript, Automation permission, Accessibility permission, or System Settings UI control is required. Settings saved by earlier versions of this extension keep working.

## Limitations

Private APIs can change between macOS versions. Live refresh is best-effort: some video players and browser HTML5 full-screen windows control their own menu bar presentation. Leave and re-enter full screen if such an app does not reflect the new setting. When a mode that hides the bar is applied while an AppKit full-screen space is already open, macOS keeps the bar revealed until the pointer moves. Final preference validation confirms the selected system mode, not the appearance of every application's full-screen space. The pulse may briefly change menu bar visibility while it applies the setting.

Originally created by **iamyeizi**, retaining the original extension icon and MIT license. Native controls and the mode picker contributed by **0xAdriaTorralba**.

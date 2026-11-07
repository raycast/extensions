# Display Switch

Enable or disable individual displays from Raycast. Search by display name and press Enter to switch its state. Disabled displays stay in the list so you can turn them back on.

## Commands

| Command | What it does |
| --- | --- |
| **Toggle Displays** | Lists displays with their On/Off, Main, and Built-in states. Press Enter to toggle one. Use **⌘R** to refresh, **⌘⇧E** to enable all, or **Copy Display UUID** to identify identical monitors. |
| **Enable All Displays** | Enables every identifiable connected display and retries pending layout restoration. Assign a hotkey for recovery. |
| **Toggle Display by Name** | Toggles a display by its exact name or UUID. Duplicate names require a UUID. |

## Safety and recovery

- Display Switch refuses to disable the last independent active display. Mirrored displays must be unmirrored first.
- Before switching a display off, it saves its identity, resolution, and position. It checks the live display inventory before each change and confirms the resulting state afterward.
- Disabled displays can disappear from macOS's public display list. Display Switch uses the full WindowServer inventory and saved identity to find and restore them.
- **Enable All Displays** turns on every identifiable connected display, including displays disabled by other software. Reconnect a monitor if macOS cannot identify it.
- Changes apply to the current login session. Logging out or restarting restores normal macOS display handling. Display Switch installs no background service.
- If a display turns on but its previous resolution or position cannot be restored, the command reports the display as On and shows a layout warning. Adjust its layout in System Settings; Enable All Displays retries a pending restoration.

## Platform limits

Display Switch requires macOS 13 or later. macOS has no public API for disabling an individual display, so the extension uses private SkyLight APIs. Apple may change these APIs in a future macOS release. Display behavior also depends on the monitor, cable, and macOS version; this is a desktop configuration change, not a DDC hardware power command.

Displays without a stable UUID are omitted from the list. Intel helpers are compiled, but have not been hardware-tested.

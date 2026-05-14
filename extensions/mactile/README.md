# MacTile

Resize the focused macOS window with editable, percentage-based layouts from Raycast.

MacTile applies layouts on the monitor where the focused window is. If that cannot be detected, it uses the active monitor, then falls back to the main monitor. The menu bar and Dock are respected.

## Commands

- **Almost Maximise Window**: nearly fill the visible screen.
- **Large Window**, **Medium Window**, **Small Window**: apply ready-to-use sizes.
- **Manage Window Layouts**: edit presets, run layouts, duplicate layouts, and delete custom layouts.
- **Create Window Layout**: create a custom layout with width, height, and placement.
- **Apply Window Layout**: type a layout name and MacTile applies the closest match.
- **Window Layout Preset 1-3**: optional hotkey-ready presets that can be enabled from Raycast settings.

## Custom Layouts

Custom layouts can use any width and height from 1-100 percent. Placement options include centered, top, bottom, left middle, right middle, and all four corners.

Custom layouts appear inside **Manage Window Layouts**. To run one quickly from root search, use **Apply Window Layout** and type its name.

## Hotkeys

Raycast manages global hotkeys. To make a layout instant:

1. Open Raycast Settings.
2. Go to Extensions > MacTile.
3. Assign a hotkey to a built-in command or an enabled Window Layout Preset.

## Permissions

MacTile needs Accessibility permission so Raycast can move and resize windows. macOS may ask for this the first time you apply a layout.

## Author

Created by Nik. For support, feedback, or ideas, reach out on [X/Twitter](https://x.com/nikgraphx).

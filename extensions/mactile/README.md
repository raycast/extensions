# MacTile

MacTile is a Raycast extension for resizing the focused macOS window with editable percentage-based layouts and Raycast hotkeys.

Layouts use the focused window's monitor whenever possible, so the menu bar and Dock are respected on that display. If MacTile cannot determine the focused window's monitor, it tries the active monitor and then falls back to the main monitor. Each layout has a width, height, and placement. Placement can be centered, top, bottom, left middle, right middle, or any corner.

## Fast Presets

These commands appear in Raycast root search and can be assigned global Raycast hotkeys:

- **Almost Maximise Window**: nearly fills the visible screen while keeping macOS margins.
- **Large Window**: makes the focused window large without fully maximising it.
- **Medium Window**: uses a balanced working size.
- **Small Window**: uses a compact focused size.
- **Window Layout Preset 1**, **Window Layout Preset 2**, **Window Layout Preset 3**: optional command-backed presets for your own fast layouts.
- **Apply Window Layout**: type a layout name from root search and MacTile applies the best match, including custom layouts.

The three layout presets are disabled by default to keep root search clean. Enable them from Raycast Settings > Extensions > MacTile when you want more hotkey-ready slots.

## Manage Window Layouts

Use **Manage Window Layouts** to run, edit, duplicate, and delete layouts. Built-in command-backed layouts can be edited, so changing **Large Window** in Manage Window Layouts changes what the **Large Window** root-search command applies.

Custom layouts created with **Create Window Layout** appear inside Manage Window Layouts. They are useful for extra layouts, but Raycast does not let runtime-created layouts become new root-search commands automatically. Use **Apply Window Layout** to run a custom layout quickly by name, or use the three enabled window layout preset slots when you need a layout to appear as its own root-search command or receive a global Raycast hotkey.

## Create Window Layout

Use **Create Window Layout** to add a custom layout with:

- **Name**: the display name inside Manage Window Layouts.
- **Width**: percentage of the main monitor's visible width.
- **Height**: percentage of the main monitor's visible height.
- **Placement**: where the resized window should sit.

After saving, Raycast closes and shows a small HUD.

## Hotkeys

MacTile cannot register arbitrary global keyboard shortcuts from inside extension code. Raycast owns global hotkeys. To make a layout instant:

1. Open Raycast Settings.
2. Go to Extensions > MacTile.
3. Assign a hotkey to Almost Maximise Window, Large Window, Medium Window, Small Window, or an enabled Window Layout Preset command.

## Permissions

The first resize may require Accessibility permission for Raycast in macOS System Settings. This is needed so Raycast can move and resize the focused window.

## Store Metadata

Most Store listing details come from `package.json`:

- `title`, `description`, `icon`, `author`, `categories`, and `keywords` describe the extension.
- `commands` provides each command name, subtitle, description, mode, icon, and search keywords.
- `contributors` and `pastContributors` can be added if more people maintain or meaningfully contribute to the extension.
- `metadata` screenshots are added with Raycast Window Capture and saved before publishing.

Publishing is handled by `npm run publish`, which verifies the extension and opens a pull request to Raycast's extensions repository for review.

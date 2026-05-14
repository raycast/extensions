# MacTile

MacTile is a Raycast extension for resizing the focused macOS window with editable percentage-based layouts and Raycast hotkeys.

Layouts use the main monitor's visible area, so the menu bar and Dock are respected. Each layout has a width, height, and placement. Placement can be centered, top, bottom, left middle, right middle, or any corner.

## Fast Presets

These commands appear in Raycast root search and can be assigned global Raycast hotkeys:

- **Almost Maximize**: nearly fills the visible screen while keeping macOS margins.
- **Large**: makes the focused window large without fully maximizing it.
- **Medium**: uses a balanced working size.
- **Small**: uses a compact focused size.
- **Layout Preset 1**, **Layout Preset 2**, **Layout Preset 3**: optional command-backed presets for your own fast layouts.
- **Apply Layout**: type a layout name from root search and MacTile applies the best match, including custom layouts.

The three layout presets are disabled by default to keep root search clean. Enable them from Raycast Settings > Extensions > Mactile when you want more hotkey-ready slots.

## Manage Layouts

Use **Manage Layouts** to run, edit, duplicate, and delete layouts. Built-in command-backed layouts can be edited, so changing **Large** in Manage Layouts changes what the **Large** root-search command applies.

Custom layouts created with **Create Layout** appear inside Manage Layouts. They are useful for extra layouts, but Raycast does not let runtime-created layouts become new root-search commands automatically. Use **Apply Layout** to run a custom layout quickly by name, or use the three enabled layout preset slots when you need a layout to appear as its own root-search command or receive a global Raycast hotkey.

## Create Layout

Use **Create Layout** to add a custom layout with:

- **Name**: the display name inside Manage Layouts.
- **Width**: percentage of the main monitor's visible width.
- **Height**: percentage of the main monitor's visible height.
- **Placement**: where the resized window should sit.

After saving, Raycast closes and shows a small HUD.

## Hotkeys

Mactile cannot register arbitrary global keyboard shortcuts from inside extension code. Raycast owns global hotkeys. To make a layout instant:

1. Open Raycast Settings.
2. Go to Extensions > Mactile.
3. Assign a hotkey to Almost Maximize, Large, Medium, Small, or an enabled Layout Preset command.

## Permissions

The first resize may require Accessibility permission for Raycast in macOS System Settings. This is needed so Raycast can move and resize the focused window.

## Store Metadata

Most Store listing details come from `package.json`:

- `title`, `description`, `icon`, `author`, `categories`, and `keywords` describe the extension.
- `commands` provides each command name, subtitle, description, mode, icon, and search keywords.
- `contributors` and `pastContributors` can be added if more people maintain or meaningfully contribute to the extension.
- `metadata` screenshots are added with Raycast Window Capture and saved before publishing.

Publishing is handled by `npm run publish`, which verifies the extension and opens a pull request to Raycast's extensions repository for review.

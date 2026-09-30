<div align="center">

<div>
    <img src="./assets/icons/grid.png" alt="Window Layouts" width="128" height="128" />
</div>

# Window Layouts

</div>

### Requires Raycast PRO

This extension takes open windows and tiles them into a chosen layout. Affected amount of windows depends on each individual layout.

You can choose a gap in extension settings that is applied between and around the windows.

> **NOTE!** This extension is **NOT** an automatic tiling window manager. Layout is only applied when the command is run from Raycast. At least one window must have focus when running a command.

## Tiling Layouts

### Horizontal

- **Horizontal 50/50** — Two windows, 50% width each, 100% height
- **Horizontal 70/30** — Two windows, 70% and 30% width, 100% height
- **Horizontal 30/70** — Two windows, 30% and 70% width, 100% height
- **Horizontal 75/25** — Two windows, 75% and 25% width, 100% height
- **Horizontal 25/75** — Two windows, 25% and 75% width, 100% height
- **Horizontal 3 Columns** — Three windows, 1/3 width each, 100% height
- **Horizontal 1+2** — Three windows, one large left, two stacked right
- **Horizontal 2+1** — Three windows, two stacked left, one large right

### Vertical

- **Vertical 50/50** — Two windows, 100% width, 50% height each
- **Vertical 70/30** — Two windows, 100% width, 70% and 30% height
- **Vertical 30/70** — Two windows, 100% width, 30% and 70% height
- **Vertical 75/25** — Two windows, 100% width, 75% and 25% height
- **Vertical 25/75** — Two windows, 100% width, 25% and 75% height
- **Vertical 3 Rows** — Three windows, 100% width, 1/3 height each
- **Vertical 1+2** — Three windows, one large top, two side-by-side bottom
- **Vertical 2+1** — Three windows, two side-by-side top, one large bottom

### Grid

- **Grid of 4** — Even grid, 2 columns, 2 rows
- **Grid of 6** — Even grid, 3 columns, 2 rows
- **Grid of 9** — Even grid, 3 columns, 3 rows

### Special

- **Centered Focus** — Three windows, large center (60%), two narrow sidebars
- **Picture in Picture** — Main window on top (80%), small PiP bottom-right. With 3 windows, the bottom-left is also filled

## Smart Commands

- **Auto Layout** — Automatically picks the best layout based on the number of open windows
- **Pick Layout** — Browse all layouts with their icons, reorder windows (⌥↑/⌥↓) to decide which goes in which slot. Shows actual app icons for easy identification

## Save & Restore

- **Save Current Layout** — Save the current window positions to restore later
- **Restore Saved Layout** — Browse and restore previously saved window positions

## Custom Layouts

- **Create Custom Layout** — Define your own layout using a JSON grid (e.g. `[[1,1,2],[3,4,2]]`)
- **Custom Layouts** — Browse, apply, and manage your custom layouts. Create new layouts directly from the list (⌘N). Confirmation dialogs protect against accidental deletions and overwrites

## Preferences

- **Gap** — Gap size between and around windows (0–128px)
- **Disable notifications** — Hide the "Windows arranged" success toast
- **Keep Raycast open** — Keep the Raycast window open after tiling
- **Excluded Apps** — Comma-separated list of app names to exclude from tiling (e.g. "Finder, Spotify")

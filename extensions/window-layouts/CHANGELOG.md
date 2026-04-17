# Window Layouts Changelog

## [New Features & Improvements] - 2026-04-11

### New Layouts
- Added Horizontal 75/25 and 25/75 split layouts
- Added Vertical 75/25 and 25/75 split layouts
- Added Grid of 6 (3x2) and Grid of 9 (3x3) layouts
- Added Centered Focus layout (large center + two sidebars)
- Added Picture in Picture layout (full screen + small corner window)

### New Commands
- **Auto Layout**: automatically picks the best layout based on the number of open windows
- **Pick Layout**: browse layouts and reorder windows to assign them to specific slots
- **Save Current Layout**: save window positions by app name for later restoration
- **Restore Saved Layout**: browse and restore previously saved window positions
- **Create Custom Layout**: define custom layouts using JSON grid notation
- **Custom Layouts**: browse and apply user-defined custom layouts

### New Preferences
- **Excluded Apps**: comma-separated list of app names to exclude from tiling

### Bug Fixes
- Fixed `parseInt` + `??` fallback that would not catch `NaN` values in gap preference
- Fixed animated toast staying visible on early return (no windows/desktop found)
- Fixed `Promise.allSettled` silently swallowing window arrangement failures — now reports the count
- Fixed typo "heigth" → "height" in vertical-50-50 command description

### Improvements
- Unified `getActiveDesktop` + `getResizableWindows` into a single `getDesktopContext` call (one `canAccess` check, parallel API calls via `Promise.all`)
- Made `getUserPreferences` synchronous (underlying `getPreferenceValues` is sync)
- Exported `calculateCellSize` and `getWindowFrames` for reuse by Pick Layout command
- Restore Layout now correctly handles multiple windows from the same app
- Confirm dialogs before deleting or overwriting saved and custom layouts
- Pick Layout shows actual app icons and layout-specific icons
- Pick Layout reorder shortcuts changed to ⌥↑/⌥↓ (fixes conflict with section navigation)
- Custom Layouts list includes "Create Custom Layout" action (⌘N)
- All delete actions use standard Raycast shortcut (⌃X)

## [Improvements] - 2024-11-20

- Refined window gap alignment to match Raycast's default spacing, ensuring consistent visual layout and improved user experience
- Updated README with more detailed information about the extension and its features

## [Initial Version] - 2024-11-18

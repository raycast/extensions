# GraphCalc Changelog

## [Themes and share as image] - 2026-09-14

- The graph now paints its own card background, so grid, axes, labels and the curve keep legible contrast whatever Raycast theme is active (macOS and Windows)
- The expression is drawn inside the card as its title instead of as a LaTeX heading above it, so it matches the theme
- New `Switch Theme` submenu and `Next Theme` action (⌘⇧;) with six themes: System (follows light/dark appearance), Paper, Noir, Terminal, Blueprint and Synthwave
- Replaces the line-color picker; a saved line color is migrated to the closest theme on first launch
- New Share actions: `Copy Image` (⌘⇧C), `Paste Image` (⌘⇧V) and `Save Image to Downloads` (⌘⇧S) export the graph card exactly as shown, at 2x resolution (1600×672 PNG), in the active theme (macOS only; rendered with QuickLook)
- New `Copy SVG` action on macOS and Windows copies the same card as SVG markup
- Saved files are named `graphcalc-<expression>-<date>.png` and never overwrite an existing file
- New `Plot Detail` preference (Standard / High / Very High / Maximum) to sample more points for curves that look jagged or broken when zoomed far out; the default is unchanged
- Fixed keyboard shortcuts on Windows: shortcuts declared with the macOS `cmd` modifier were silently dropped there, so panning, Reset View, Next Theme and Edit Expression had no shortcut. Windows now uses `Ctrl` `Alt` + arrows to pan, `Ctrl` `Shift` `R` to reset, `Ctrl` `Shift` `T` for Next Theme and `Ctrl` `T` / `Ctrl` `E` for Switch Theme / Edit Expression (Raycast for Windows reserves `Ctrl` `Shift` + arrows)
- New `Delete from History` action on history items (⌃X on macOS, Ctrl+D on Windows); `Clear History` is now marked destructive and no longer sits on ⌘↵, where it was easy to trigger by accident
- Faster plotting: the expression is now compiled once per redraw instead of re-parsed at every point, and path coordinates are rounded, roughly halving the size of the embedded graph

## [Fix missing graph line on Windows] - 2026-09-13

- Fixed the plotted line not being rendered on Windows. The SVG used Raycast `Color` tokens (e.g. `raycast-yellow`) as the stroke color, which the image renderer cannot interpret; they are now resolved to concrete hex colors adapted to light/dark appearance
- Fixes https://github.com/raycast/extensions/issues/24231

## [SVG Rendering Rewrite and Dependency Cleanup] - 2025-12-12

- Replaced recharts library with custom pure SVG rendering for better compatibility
- Fixed LaTeX rendering issues (now using proper `$$expression$$` syntax)
- Removed unused dependencies (recharts, chart.js, react-dom)
- Improved graph rendering reliability with static SVG generation
- Better theme support with proper color adaptation for light/dark modes
- More accurate graph scaling and axis labels
- Fixes https://github.com/raycast/extensions/issues/23451

## [🔍Zoom, 🧭panning navigation and 🐛bugfixes] - 2024-11-30

- Along with the ability to zoom and pan, the graph now has a reset button
- Color toggle for the graph
- Fix rendering for infinite values so -Infinity and Infinity are not connected by a line
- Use MathMl in the formula representation
- Refactoring and cleanup

## [Fixing colors] - 2024-11-09

- Color fixes for graph, darkmode was not easy to read

## [Bug Fixes and Improvements🐛] - 2024-05-28

- Fixing empty state flicker issue
- Removing History from the graph view
- Fixing control state on List

## [Initial Version] - 2024-05-17

- Add logic to handle both expressions and equations
- Add a history panel to view previous actions

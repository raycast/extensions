# Cursors Changelog

## [PNG export, Quick Look, backdrops & modernization] - 2026-07-19

- Added **Copy as PNG**, **Paste as PNG**, and **Save as PNG** submenus — export any cursor as a transparent PNG at 16, 32, 64, 128, 256, or 512px. PNGs are vector-rendered from the source SVG, so they stay crisp at every size.
- Added **Quick Look** (⌘Y) to preview any cursor full-size without leaving Raycast.
- Added **Set Preview Backdrop** (None / White / Black / 50% Gray) so light and dark cursors can be judged against a matching well. Preview-only — exported PNGs stay transparent.
- Added **Copy Cursor Name** and **Open Support Folder** actions.
- Fixed colored cursor previews (`copy`, `wait`, `not-allowed`, `crosshair`, `money`, `poof`, `beachball`) that rendered blank because their hex fill colors truncated the SVG data URI.
- Fixed cursor data: corrected the `grapping` → `grabbing` and `zoom-ut` → `zoom-out` typos, removed a stray `<title>Test</title>` debug artifact from the default cursor, and replaced the trailing `*` name marker on macOS-only cursors with a dedicated grid accessory.
- Fixed the "7 Columns" grid preference (was silently `7x`).
- Modernized the toolchain: `@raycast/api` 1.104, ESLint 9 (flat config), TypeScript 5.9, Node 22, and added a Vitest test suite for the SVG/PNG rendering.

## [Update] - 2025-01-15

Updated and rearranged all cursor/names to the html/css names

## [Initial Version] - 2025-01-15

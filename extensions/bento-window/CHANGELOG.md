# Bento Window Changelog

## [Initial Release] - 2026-08-13

- Tile multiple windows of the same app into bento‑box grids
- Auto‑adapts layout to window count: 2 (halves), 3 (left two + right big), 4 (2×2), 5 (left 2×2 + right big), 6 (3×2), 7 (4×2 last wide), 8 (4×2), 9 (3×3), 10+ (5×2)
- Two commands: Auto Tile (single app's windows) and Auto Tile All (every tileable window on the active desktop)
- Comma‑separated app priority list with auto‑detect fallback (empty = use focused window's app)
- Targets the desktop the windows are on when multiple desktops are active (multi‑display setups)
- Configurable gap, default 0 for flush tiles

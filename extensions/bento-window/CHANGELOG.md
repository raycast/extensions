# Bento Window Changelog

## [No Pro Required, Portrait Grids & Faster Tiling] - {PR_MERGE_DATE}

- **Works without a Raycast Pro subscription.** Bento Window used to depend on the Pro-gated Window Management API, which left every command unavailable on a free account. It now enumerates windows through CGWindowList and moves them through the Accessibility API instead, so anyone can use it. It needs Accessibility permission for Raycast — System Settings → Privacy & Security → Accessibility — and the first run offers a shortcut straight there if the permission is missing
- **Portrait displays now get portrait grids.** The layouts were tuned for landscape screens, so two windows on a portrait display used to become two slivers side by side. Each layout is now measured against its own transpose and the better-fitting one wins: two windows stack, 6 becomes 3×2 instead of 2×3, and landscape screens keep the exact layouts they had
- **Tiling is noticeably quicker** — roughly 40% less time between the keystroke and the finished grid, so the windows land together instead of popping into place one after another
- **Fixed:** two windows of the same app sitting almost on top of each other could swap grid slots, which defeated the creation-order sorting
- **Fixed:** on a multi-display setup the tiled desktop is now the one your pointer is on. It used to be inferred from the window stacking order, which with per-display Spaces regularly picked a screen you weren't working on
- **Fixed:** tiles could overlap or leave a hairline gap when the grid didn't divide the screen evenly

## [Toggle, Stable Order & Excluded Apps] - 2026-08-14

- Toggle: running the same command again restores every window to its original position. If you have dragged windows out of the grid, the same press snaps them back into place instead — and one more press still returns to the original layout
- Windows are now sorted by creation order before grid placement, so the same set of windows always lands in the same slots across repeated invocations
- New Excluded App Names preference — listed apps are never tiled, even by Auto Tile All

## [Initial Release] - 2026-08-13

- Tile multiple windows of the same app into bento‑box grids
- Auto‑adapts layout to window count: 2 (halves), 3 (left two + right big), 4 (2×2), 5 (left 2×2 + right big), 6 (3×2), 7 (4×2 last wide), 8 (4×2), 9 (3×3), 10+ (5×2)
- Two commands: Auto Tile (single app's windows) and Auto Tile All (every tileable window on the active desktop)
- Comma‑separated app priority list with auto‑detect fallback (empty = use focused window's app)
- Targets the desktop the windows are on when multiple desktops are active (multi‑display setups)
- Configurable gap, default 0 for flush tiles

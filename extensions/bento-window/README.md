<p align="center">
  <img src="assets/extension-icon.png" alt="Bento Window" width="160" height="160" />
</p>

<h1 align="center">Bento Window</h1>

<p align="center">A Raycast extension that tiles a single app's windows into a bento-box grid.</p>

<p align="center">
  <a href="https://github.com/raycast/extensions/pull/27877"><img src="https://img.shields.io/badge/Raycast_Store-pending_review-yellow?style=flat-square" alt="Raycast Store: pending review" /></a>
  <a href="https://github.com/ipopo/bento-window/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue?style=flat-square" alt="MIT" /></a>
  <img src="https://img.shields.io/badge/platform-macOS-lightgrey?style=flat-square" alt="macOS" />
</p>

---

A Raycast extension that tiles **a single app's windows** into a bento-box grid with one keystroke. The grid auto-adapts to how many windows you have open — 4 windows become 2×2, 6 become 3×2, 9 become 3×3, and so on.

Built for the **vibe coding** workflow where you spin up several terminals (Ghostty, Terminal, iTerm2…) and want them snapped into place without dragging each one into a quarter.

## How this differs from [Window Layouts](https://www.raycast.com/teemu_suvinen/window-layouts)

Window Layouts is excellent and the auto-layout algorithm here is intentionally similar. **The one thing Bento Window does that Window Layouts doesn't: it filters by app.**

| Scenario | Window Layouts | Bento Window |
|---|---|---|
| Tile only Ghostty windows, leave Chrome / VSCode untouched | ❌ all windows get tiled | ✅ only the target app |
| Run from the focused window, auto-detect which app to tile | ❌ | ✅ leave preference empty |
| Auto-pick a layout based on window count | ✅ | ✅ |

If you only ever want to tile every window on the desktop, **use Window Layouts instead** — it's mature and has more layout options. Bento Window exists for the case where you want to tile *just one app's windows*.

## Layouts

The grid the extension picks based on the number of windows of the target app:

```text
1 window — fullscreen          2 windows — halves
┌──────────────┐               ┌──────┬──────┐
│              │               │      │      │
│      1       │               │  1   │  2   │
│              │               │      │      │
└──────────────┘               └──────┴──────┘

3 windows — small × 2 + big    4 windows — 2×2
┌──────┬──────┐                ┌──────┬──────┐
│  1   │      │                │  1   │  2   │
├──────┤  3   │                ├──────┼──────┤
│  2   │      │                │  3   │  4   │
└──────┴──────┘                └──────┴──────┘

5 windows — 2×2 small + big    6 windows — 3×2
┌───┬───┬────────┐             ┌────┬────┬────┐
│ 1 │ 2 │        │             │ 1  │ 2  │ 3  │
├───┼───┤   5    │             ├────┼────┼────┤
│ 3 │ 4 │        │             │ 4  │ 5  │ 6  │
└───┴───┴────────┘             └────┴────┴────┘

7 windows — 4×2 (last wide)    8 windows — 4×2
┌───┬───┬───┬───┐              ┌───┬───┬───┬───┐
│ 1 │ 2 │ 3 │ 4 │              │ 1 │ 2 │ 3 │ 4 │
├───┼───┼───┴───┤              ├───┼───┼───┼───┤
│ 5 │ 6 │   7   │              │ 5 │ 6 │ 7 │ 8 │
└───┴───┴───────┘              └───┴───┴───┴───┘

9 windows — 3×3                10+ windows — 5×2 (extras untouched)
┌────┬────┬────┐               ┌──┬──┬──┬──┬──┐
│ 1  │ 2  │ 3  │               │1 │2 │3 │4 │5 │
├────┼────┼────┤               ├──┼──┼──┼──┼──┤
│ 4  │ 5  │ 6  │               │6 │7 │8 │9 │10│
├────┼────┼────┤               └──┴──┴──┴──┴──┘
│ 7  │ 8  │ 9  │
└────┴────┴────┘
```

## Install (manual, before Store release)

This extension is not yet on the Raycast Store. To run it locally:

```bash
git clone https://github.com/ipopo/bento-window.git
cd bento-window
npm install
npm run dev
```

`npm run dev` registers the extension with Raycast and watches for code changes. You can `Ctrl+C` it once the extension shows up — the registration persists.

Then in Raycast:

1. Open a few windows of your target app (Ghostty, Terminal, etc.)
2. Run **Bento Tile**
3. Optional: assign a global hotkey (Raycast Settings → Extensions → Bento Window → record hotkey)

## Configuration

Raycast Settings → Extensions → **Bento Window**:

- **Target app names** — comma-separated list, tried in order. The first app with windows on the active desktop gets tiled.
  - Default: `Ghostty, Terminal, iTerm2, Alacritty, WezTerm`
  - Leave **empty** for auto mode — the extension uses the currently focused window's app. Works for any app you're focused in.
- **Gap** — pixels between tiles and screen edges. `0` (default) for flush tiles.

## Requirements

- macOS
- Accessibility permission granted to Raycast (System Settings → Privacy & Security → Accessibility)

## License

MIT

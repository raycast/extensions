# resize — viewport-accurate window presets for responsive dev

Raycast extension (v1). Chrome-only. Resizes the frontmost Chrome window so the **browser viewport** — not the outer window — matches a target device's effective viewport. Honest about what a window resize cannot simulate.

Future: port the proven preset logic to a Glaze/native app ("v2"), reading the same preset file.

## Goal

One keystroke to see a layout at the viewport a real MBP 14 / MBP 16 / iPad user sees, while developing on an external monitor in clamshell mode.

## Non-goals (v1)

- Simulating touch, `pointer: coarse`, `hover: none`, DPR 3, safe areas, `dvh`/URL-bar collapse, on-screen keyboard. Window resizing cannot do these; the tool never pretends it can (phone/iPad HUDs say "geometry only").
- Browsers other than Chrome. (Arc/Safari later; the algorithm is per-browser scripting, the data is shared.)

Note: Chrome's ~500px minimum window width applies only to *drag*-resizing — programmatic `set bounds` goes as low as 200px with exact `innerWidth` (verified empirically on Chrome 150). So **all presets resize, including iPhones**. A `phoneMode` preference switches iPhone-class presets to opening DevTools device mode instead.

## Correctness model

A macOS window resize correctly simulates exactly one context: **CSS viewport w×h at DPR 2, fine pointer, hover-capable**. That covers MacBooks fully and iPad *geometry* (not input model). Every preset therefore declares:

- `strategy: "window"` — the window resizes to the preset's viewport (all built-in presets)
- `strategy: "info"` — selecting shows device facts only, never resizes (available for custom presets)

Phone-class presets additionally respect the `phoneMode` preference: `resize` (default) resizes the window — geometry only, honest HUD caveat — or `devtools`, which activates Chrome and opens DevTools device mode (⌥⌘I + ⌘⇧M via System Events; needs Raycast Accessibility permission).

### DevTools parity

Presets behave exactly like Chrome DevTools device presets: the **viewport** equals the device's stated dimensions (iPad Air → viewport 820×1180, MBP 14 → 1512×982). No subtraction of the target device's own browser chrome — same contract as DevTools, same numbers as spec sheets. The chrome that *is* subtracted (via live measurement, below) is the local Chrome window's own UI, so the viewport — not the outer window — hits the preset numbers.

## Resize algorithm (the differentiator)

Never guess chrome size — measure it. Pure AppleScript against Chrome, **no Accessibility permission needed**:

1. `execute javascript` in the active tab:
   `JSON.stringify({iw:innerWidth, ih:innerHeight, dpr:devicePixelRatio})`
2. Read `bounds of front window` → chrome delta = bounds − inner (both axes).
3. `set bounds of front window` = target viewport + delta, keeping current x/y, clamped into the current display's visible frame.
4. Re-measure once; if off (fractional rounding), adjust. Converges in ≤2 iterations.
5. HUD: `MacBook Pro 14 — viewport 1512×982 ✓`

### Guards

- **Zoom:** on Retina, `devicePixelRatio` = 2.0 at 100% zoom. If `dpr % 2 !== 0` → warn "Chrome zoom is not 100% — CSS px ≠ points" and abort (resizing would hit wrong breakpoints).
- **Scrollbars:** media queries evaluate against `innerWidth` *including* scrollbar — which is what we measure. Overlay (trackpad) vs always-on 15px (external mouse / clamshell) is therefore handled automatically.
- **Doesn't fit** (e.g. iPad portrait 1376 tall on a 982pt laptop display): clamp height to available, keep width exact, HUD warns `height clamped 940/1376 — fold & dvh not representative`.
- **JS-from-Apple-Events disabled:** detect the AppleScript error, show one-time setup instruction (Chrome → View → Developer → Allow JavaScript from Apple Events).
- **No Chrome window / Chrome not frontmost:** clear error, no silent fallback.

## Commands

| Command | Behavior |
|---|---|
| **Resize to Preset** | Searchable list of all presets grouped by class (Laptop / iPad / iPhone / Custom). Enter applies (or shows info card for `info` presets). Each item exposes a deeplink → per-preset hotkeys via Raycast Quicklinks. |
| **Cycle Breakpoints** | No-view command on a repeatable hotkey. Rotation is set by three dropdown slots in extension settings (default trio: MBP 14 → iPad portrait → iPhone; slots can be skipped). HUD shows position: `2/3 · iPad Air 11 · 820×1180`. State in LocalStorage, resets after 60s idle. A `cycle` array in `~/.config/resize/presets.json` overrides the slots — the way to get >3 steps or custom presets into the rotation. Hotkey binding itself is native Raycast (Configure Command). |
| **Add Custom Preset** | Form (name, viewport w×h, class, note) → appends to the user preset file. |
| **Measure Viewport** | Diagnostic: shows current inner size, outer bounds, chrome delta, DPR/zoom. |

### Hotkey model

- Primary: **cycle hotkey** (suggest ⌥⌘R) — hit repeatedly, watch the layout reflow.
- Secondary: per-preset Quicklink hotkeys for favorites (⌥⌘1 = MBP 14, ⌥⌘2 = iPad, …).

## Preset data

Built-ins ship in `assets/devices.json`. User presets live in **`~/.config/resize/presets.json`** (hand-editable, dotfiles-versionable, survives Raycast reinstalls, shared 1:1 with the future Glaze port). User file merges over built-ins by `id`; the `cycle` array in the user file, if present, replaces the default.

Schema (per preset):

```jsonc
{
  "id": "mbp14",
  "name": "MacBook Pro 14\"",
  "class": "laptop",              // laptop | tablet | phone | custom
  "viewport": { "w": 1512, "h": 982 },  // = device dimensions, DevTools parity
  "basis": "screen",              // screen | split | custom
  "dpr": 2,
  "pointer": "fine",              // fine | coarse
  "hover": true,
  "strategy": "window",           // window | info
  "warnings": []                   // shown in HUD/info card
}
```

## What each device class means (reference)

**Laptop (fully simulatable):** hover + fine pointer, DPR 2 — identical to the test context. Only gotcha is scrollbar overlay vs always-on; handled by measurement.

**iPad (geometry only):** DPR 2 matches; UA accidentally matches (iPadOS Safari sends desktop UA). NOT simulated: `hover: none` / `pointer: coarse` (menus that need hover will look fine here and break on device), sticky-hover double-tap, 44pt touch targets, safe-area insets, rubber-band scroll. iPad is a **range**: Split View/Stage Manager go down to 320pt — split presets included.

**iPhone (info only):** DPR 3 (hairlines/images differ), `dvh` vs collapsing URL bar, keyboard vs `visualViewport`, `position: fixed` quirks, 16px input auto-zoom, Dynamic Island/landscape safe areas, tap highlight, no hover. Info card lists these as a per-device test checklist + DevTools shortcut.

## Verification plan

1. `Measure Viewport` vs Chrome DevTools' displayed viewport size — must match exactly.
2. Apply MBP 14 preset, run `window.innerWidth/innerHeight` manually → 1512×982.
3. Apply iPad Air preset, compare against DevTools' built-in iPad Air preset → identical numbers.
4. Toggle bookmarks bar / always-on scrollbars, re-apply → still exact (measurement, not constants).
5. Set zoom 110% → tool warns and aborts.
6. iPad portrait preset on laptop display → width exact, clamp warning shown.

## Milestones

1. **Scaffold** — `create-raycast-extension`, TypeScript, commands stubbed.
2. **Core** — AppleScript bridge (measure/set/re-measure), Resize to Preset with built-in data.
3. **Flow** — Cycle Breakpoints + hotkeys, clamp/zoom/setup guards, HUD copy.
4. **Custom** — `~/.config/resize/presets.json` read/merge + Add Custom Preset form.
5. **Verify** — plan above (DevTools parity checks).
6. **Later** — publish to Raycast store (needs differentiation writeup vs Window Sizer: viewport-accuracy + effective-viewport presets + honesty model); Glaze/native port reading the same preset file.

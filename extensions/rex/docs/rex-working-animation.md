# Rex's "working" indicator and corner dot

Recovered on 2026-10-13 from `Rex Beta.app/Contents/MacOS/Rex` (class `_TtCO3Rex9Workspace22TabStatusIndicatorView`,
source file `Rex/TabStatusIndicatorView.swift`) and Michal's screenshots of 14:09–14:10. Each item is marked
**confirmed** (read from the binary or measured in a screenshot) or **inferred**.

## The three dots (working, no progress)

- **Where**: an `NSView` with a `dotsLayer` holding three `CALayer` dots (`dotLayers`), shown at the tab's trailing
  edge where the close button otherwise sits. Fields: `foregroundColor`, `isShown`, `dotStopRevision`,
  `dotsAreTraveling`, `reduceMotionOverride`. **confirmed** (ObjC ivar list)
- **Geometry** from the `layout` method's constants: 14 × 14 pt view, dot diameter 3.5 pt (radius 1.75), centres
  5.5 pt apart, the row of three (14.5 pt wide) centred. **confirmed**; the screenshot shows 7 px dots on 11 px
  centres at 2x. **confirmed**
- **Animation** (the function between `initWithCoder:` and `viewDidChangeEffectiveAppearance`): for each dot a
  `CAKeyframeAnimation(keyPath: "opacity")` with
  - `values = [0.3, 0.85, 0.3, 0.3]` (Float) and `keyTimes = [0, 0.25, 0.5, 1]`,
  - `duration = 1.2` s, `repeatCount = .infinity`,
  - timing function `kCAMediaTimingFunctionEaseInEaseOut`,
  - `beginTime = CACurrentMediaTime() + delay + index × 0.2` s, where `delay` is 0.18 s or 0 depending on a flag
    passed in (**inferred**: 0.18 s applies when the dots are restarted after a stop, i.e. `dotsAreTraveling`).
  So each dot rises from 0.3 to 0.85 opacity over 0.3 s, falls back over 0.3 s, rests at 0.3 for 0.6 s, and the
  pulse travels left to right 0.2 s apart. One cycle is 1.2 s. **confirmed** except the 0.18 s meaning.
- **Colour**: the dots are filled with `foregroundColor`; solving the screenshot intensities (198, 99, 85 over a
  22 background) against the opacities gives a foreground of about #E5E9EF, i.e. the tab's text colour, which in
  the Merino theme is #E6EDF3. **confirmed** by fit. The resting dot at 0.3 reads as (85,85,85), a ramping dot as (99,99,99).
- **Reduce motion**: `reduceMotionOverride` exists; presumably the pulse is replaced by static dots. **inferred**

## The corner dot (blocked, done)

- A filled circle overhanging the pill's top-right corner, diameter about a third of the pill height, colour
  (113,159,243) ≈ #719FF3 with a dark outline, the same for blocked (all three kinds) and done in the
  screenshots. **confirmed** from screenshots; no per-state colour table was found in the binary in the time box,
  so error is **inferred** to use Rex's error hue #FF7047 and idle to show nothing (idle showed nothing in the screenshots).

## The progress pie (working with progress)

- Replaces the glyph inside the pill: a thin ring in the glyph's foreground colour with a filled wedge from
  12 o'clock clockwise and a small gap between ring and wedge. **confirmed** from screenshots (geometry measured
  by Fork A).

## How the extension reproduces it

`src/rex/dots-painter.ts` evaluates the same keyframes (smoothstep standing in for ease-in-ease-out) at
6 frames per 1.2 s cycle, i.e. every 200 ms, which is Rex's stagger step, and `src/rex/useWorkingFrame.ts`
advances the frame on that interval while any pane is working. Raycast cannot animate an icon itself, so the
row swaps between six cached PNGs.

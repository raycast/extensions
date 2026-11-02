# Conversion notes

Precise limits and platform conventions behind Motion Rosetta's conversions. The [README](README.md) covers everyday use.

## Input limits

- Input is limited to 200,000 characters, 2,049 supplied linear entries (up to 4,098 expanded stops), and 512 steps.
- Spring objects accept unquoted keys and trailing commas, but never execute expressions.
- Physical input bounds: mass 0.001–1e6, stiffness 0.001–1e15, damping 0–1e15, and velocity ±1e6. Derived exports outside those bounds are not guaranteed to re-import.
- `.timingCurve(...)` is also accepted as `Animation.timingCurve(...)`. DTCG cubicBezier tokens may include an optional duration. Duration-only tokens cannot reconstruct a curve.
- Generated linear/steps function templates are re-imported by extracting their data, regenerating the template, and comparing the entire snippet. Output support does not imply arbitrary-code import.

## Duration

Pasted SwiftUI timing curves, CSS transition declarations, Motion Bézier objects and Tailwind easing classes retain explicit duration in previews and supported exports. Editing duration applies to the current input. Figma control points do not carry duration. For springs, the editor updates frequency, stiffness, and damping.

## Apple springs

Curve and Spring remain separate internally. For Apple duration `d` and bounce `b`: `ω₀ = 2π/d`, `ζ = 1 − b` when `b ≥ 0`, otherwise `ζ = 1/(1+b)`, `k = mω₀²`, and `c = 2ζ√(km)`. Apple bounce must be greater than −1 and at most 1. The reverse mapping is `b = 1 − ζ` for `ζ ≤ 1`, otherwise `b = 1/ζ − 1`. Motion's bounce convention is handled separately.

SwiftUI uses physical parameters when mass or initial velocity must be retained. Overdamped cases requiring that physical initializer are Unavailable: Apple's `Spring` physical initializer clamps damping, and equivalent behavior of `Animation.interpolatingSpring` has not been established. No exact export is claimed for that unverified path.

## Motion

Motion `visualDuration` uses **Apple duration / 1.2**. Motion's separate `duration` option uses its settling-time solver. Physics options take precedence over time-based options; discarded values are disclosed.

## Jetpack Compose

Compose normalizes stiffness to `k/m`. Nonzero velocity must be supplied separately to its animation API. Compose duration is rounded to whole milliseconds; fractional-millisecond conversions are labeled Lossy.

## Figma

Figma **Prototype** preserves physical spring parameters. Figma **Motion** exports bounce only and loses natural frequency. Acceptance of bare Bézier numbers versus `cubic-bezier(...)` in Figma's paste field remains unverified; both spellings are offered.

## DTCG 2025.10

DTCG 2025.10 has a `cubicBezier` token but no spring token. A spring can export only its undamped period as a duration, losing dynamics. Linear/steps curves have no native easing token; a duration-only export requires an explicit duration.

## Springs and CSS

Target crossings are counted over a finite window; two or more explicitly rule out a single cubic-bezier. CSS spring output uses sampled `linear()`, with timing and tail truncation disclosed. Undamped springs do not settle.

## Previews and timing

Format detection and output text update immediately. Graphs wait 60 ms; GIF generation waits for a 400 ms typing pause. GIFs use 680 × 352 pixels displayed at 340 × 176, up to 60 motion samples and two holds. A 20 ms minimum frame delay can slow very short motions. Staggered List adds 0.3 seconds of stagger. Compact code is shortened for display only; copying includes the full snippet.

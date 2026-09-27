# Motion Rosetta

Paste an easing, inspect its response, and copy a platform equivalent with an explicit statement of what survives conversion.

## Getting started

1. Open **Convert Easing** and paste an easing into the search bar, or choose a preset.
2. Select an output format. Press **Return** to copy it, or use **Actions** to copy another available format.
3. Switch the component using **Preview** tags: Sheet, Toggle, Tooltip, or Staggered List.
4. Select **Duration → Edit** to enter whole milliseconds in the same search bar. Apply to confirm; use **Cancel Duration Edit** to discard.
5. Choose **View Full Conversion** for complete code, fidelity notes, target crossings, and timing details.

The component preview and response curve are separate blocks. Scroll the detail to inspect the curve and code. A theme-matched component poster stays visible while the animation loads. The last preview component is remembered.

Format detection and output text update immediately. Graphs wait 60 ms; GIF generation waits for a 400 ms typing pause. Invalid input disables copying rather than copying a previous result.

## Supported inputs

| Input                 | Example                                                    |
| --------------------- | ---------------------------------------------------------- |
| CSS keyword           | `ease-in-out`                                              |
| Figma / bare Bézier   | `0.42, 0, 0.58, 1`                                         |
| CSS cubic Bézier      | `cubic-bezier(0.42, 0, 0.58, 1)`                           |
| Four-number array     | `[0.42, 0, 0.58, 1]`                                       |
| CSS piecewise linear  | `linear(0, 0.35 20%, 1.15 55%, 1)`                         |
| Motion physics spring | `{ type: "spring", stiffness: 100, damping: 10, mass: 1 }` |
| Motion time spring    | `{ type: "spring", visualDuration: 0.5, bounce: 0.6 }`     |
| SwiftUI spring        | `.spring(duration: 0.5, bounce: 0.6)`                      |
| CSS steps             | `steps(4, jump-end)`                                       |

Spring objects accept unquoted keys and trailing commas, but never execute expressions. Input is limited to 200,000 characters, 2,049 supplied linear entries (up to 4,098 expanded stops), and 512 steps.

The preset browser contains five CSS keywords, Motion Back In / Back Out, and six authored Rosetta physical springs. These are not claimed as Figma presets. See [sources and asset provenance](SOURCES.md).

## Outputs and fidelity

Outputs include Figma, CSS cubic-bezier, CSS linear(), Motion, SwiftUI, Jetpack Compose, Tailwind, and DTCG 2025.10.

- **Exact** preserves the mathematical curve or physical response, subject to decimal precision and platform runtime thresholds. Completion behavior may differ between platforms.
- **Sampled** is a finite approximation. Notes report sampling and measured interpolation error, not a proven global error bound.
- **Lossy** identifies discarded information.
- **Unavailable** means no supported faithful representation is emitted; copying is disabled.

Springs are never automatically fitted to cubic Bézier. Target crossings are counted over a finite window; two or more explicitly rule out a single cubic-bezier. CSS spring output uses sampled `linear()`, with timing and tail truncation disclosed. Undamped springs do not settle.

Figma **Prototype** preserves physical spring parameters. Figma **Motion** exports bounce only and loses natural frequency. Acceptance of bare Bézier numbers versus `cubic-bezier(...)` in Figma's paste field remains unverified; both spellings are offered.

DTCG 2025.10 has a `cubicBezier` token but no spring token. A spring can export only its undamped period as a duration, losing dynamics. Linear/steps curves have no native easing token; a duration-only export requires an explicit duration.

SwiftUI arbitrary linear/steps examples use `CustomAnimation` (iOS 17+ / macOS 14+). Nonstandard endpoints are marked lossy because SwiftUI finishes at its target.

## Duration and preview limits

Curves without timing default to **0.5 seconds**, labeled assumed. Pasted SwiftUI timing curves, CSS transition declarations, Motion Bézier objects and Tailwind easing classes retain explicit duration in previews and supported exports. Editing duration applies to the current input; a new pasted input does not inherit the previous edit. Figma control points do not carry duration.

Additional accepted snippets include `.timingCurve(...)` (also `Animation.timingCurve(...)`), physical `.interpolatingSpring(...)`, `CubicBezierEasing(...)`, Bézier `tween(...)`, Compose `spring<Float>(...)`, `{ ease: [...] }`, CSS transition declarations, Tailwind easing classes, and DTCG cubicBezier tokens with optional duration. Input is parsed as data, never executed. Generated Rosetta linear/steps function templates can be re-imported: the parser extracts their data, regenerates the template, and compares the entire snippet. Modified functions and arbitrary application code are not input formats. Duration-only tokens cannot reconstruct a curve. Physical input bounds still apply: mass 0.001–1e6, stiffness 0.001–1e15, damping 0–1e15, and velocity ±1e6. Derived exports outside those bounds are not guaranteed to re-import. Output support does not imply arbitrary-code import. Invalid or unsupported input disables copying and explicitly labels the previous valid curve.

Compose duration is rounded to whole milliseconds; fractional-millisecond conversions are labeled Lossy. Automated tests cover each destination, round trips, response samples, duration boundaries, generated templates, malformed input, and cache policy. They do not establish equivalence with every destination's runtime or guarantee absence of bugs.

For springs, the editor changes the Apple duration parameter (undamped period), **not settling time**. It preserves mass, damping ratio, and initial velocity while updating frequency, stiffness, and damping. Metadata reports the distinct settling window.

Previews demonstrate the response, not each platform's animation engine. GIFs use 680 × 352 pixels displayed at 340 × 176, up to 60 motion samples and two holds. A 20 ms minimum frame delay can slow very short motions. Staggered List adds 0.3 seconds of stagger. Compact code is shortened for display only; copying includes the full snippet.

## Keyboard shortcuts

Open **Actions → Open Shortcut Preferences** to edit bindings in native extension preferences.

Use text such as `cmd+shift+3`; `none` disables a binding. Blank fields use defaults, or migrated bindings if an earlier local version saved them. Current bindings are configured only in extension preferences. Reopen the command after changes. Invalid or duplicate bindings display an error and fall back to defaults without overwriting saved settings.

Defaults include **Ctrl+1–4** for components and **⌘↵** to confirm input. The Actions menu shows each format's binding. Bindings follow the output identity, not list position. The launcher hotkey is configured separately by Raycast. Escape remains Raycast navigation; use the explicit cancel action when editing duration.

## Privacy and local storage

No API keys, Keychain access, networking, or external analytics are used by the command. Pasted input is parsed locally as data.

GIFs are encoded with pure JavaScript and stored under the extension's support directory. Cache keys include easing, duration, component, theme, and renderer version. LRU cleanup runs on the first preview request and on admission, enforcing **200 files or 20 MiB, whichever is reached first**; large previews reach the byte limit well before 200 files. Admissions use PID-owned, atomically published reservations across processes and rescan disk usage. The admitting instance protects its displayed GIF and latest delivery; another instance's displayed image is not pinned globally. Files are written atomically. If a preview cannot be generated or stored, the static fallback remains visible with an explanatory error.

A busy cache reservation times out after five seconds and can be retried. Reservations from terminated processes are recovered automatically only when the operating system confirms that their PID no longer exists. Live or paused processes are never evicted based on age; inaccessible or reused live PIDs remain protected. Recovery and admission share ticket ordering so multiple recovering processes cannot enter together. No manual cache deletion is required after an ordinary process crash.

## Spring conventions

Curve and Spring remain separate internally. For Apple duration `d` and bounce `b`: `ω₀ = 2π/d`, `ζ = 1 − b` when `b ≥ 0`, otherwise `ζ = 1/(1+b)`, `k = mω₀²`, and `c = 2ζ√(km)`. Apple bounce must be greater than −1 and at most 1. The reverse mapping is `b = 1 − ζ` for `ζ ≤ 1`, otherwise `b = 1/ζ − 1`. These responses are checked against an executable Apple SDK oracle, not only parser round trips. Motion's bounce convention is handled separately.

SwiftUI uses physical parameters when mass or initial velocity must be retained. Overdamped cases requiring that physical initializer are Unavailable: Apple's `Spring` physical initializer clamps damping, and equivalent behavior of `Animation.interpolatingSpring` has not been established. No exact export is claimed for that unverified path.

Motion `visualDuration` uses **Apple duration / 1.2**. Motion's separate `duration` option uses its settling-time solver. Physics options take precedence over time-based options; discarded values are disclosed. Compose normalizes stiffness to `k/m`. Nonzero velocity must be supplied separately to its animation API.

## Development

Requires Node **22.22.2 or later**.

```sh
npm ci
npm run dev
npm run typecheck
npm test
npm run build
npm run lint
```

`npm run benchmark` measures parsing, emitters, and SVG generation, not Raycast's native paint. `npm run verify-swift` requires an installed Apple SDK.

Runtime PNGs are in `assets/`; editable SVG sources are in `scripts/sources/`. `npm run assets` regenerates the extension icon and graph proofs; `npm run format-icons` regenerates destination icons offline. Resvg is a development-only asset tool and is not imported by the command. Generated proofs go to ignored `.artifacts/`.

## Related extension

[Easings](https://www.raycast.com/madebyankur/easings) also offers curves and spring exports. Motion Rosetta focuses on pasted multiformat input, explicit conversion fidelity, target-crossing information, and additional platform outputs.

## References

- [Motion spring options](https://motion.dev/docs/spring)
- [SwiftUI CustomAnimation](https://developer.apple.com/documentation/swiftui/customanimation)
- [DTCG Format 2025.10](https://www.designtokens.org/tr/2025.10/format/)
- [Third-party notices](THIRD_PARTY_NOTICES.md)

MIT license.

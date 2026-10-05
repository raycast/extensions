# Presets and visual assets

## Presets

- CSS keywords: https://www.w3.org/TR/css-easing-2/ . Existing parser values remain unchanged.
- Motion Back Out: `motion-utils` 12.39.0 (resolved dependency of `motion` 12.23.24), `dist/es/easing/back.mjs`, `(0.33, 1.53, 0.69, 0.99)`. Back In reverses those control points, exactly as Motion's `reverseEasing`; tests compare 101 samples against the installed Motion implementation. Documentation: https://motion.dev/docs/easing-functions . Back In Out is not silently collapsed into a single cubic.
- Rosetta physical springs are authored example configurations, not Apple/Figma/Motion named presets. Parameters live in `src/presets.ts`; their names describe intent, not universal suitability. Duration in the input is the Apple parameter; the preview reports the distinct settling window. Preview each on the intended component before adopting it.
- Figma screenshot names alone do not establish numeric values. Its eleven pending presets remain hidden.

## Destination icons

Retrieved September 15, 2026. Runtime PNGs live in `assets/formats`; the exact SVG sources are checked into `scripts/sources/formats`. No runtime requests. Generator: `scripts/format-icons.ts` (offline, development-only Resvg, no new runtime dependency).

- Figma multicolor geometry: https://github.com/gilbarbara/logos/blob/main/logos/figma.svg . Collection dedication: https://github.com/gilbarbara/logos/blob/main/LICENSE.txt (CC0 1.0).
- Swift, Jetpack Compose, Tailwind: https://github.com/simple-icons/simple-icons/tree/develop/icons . Collection dedication: https://github.com/simple-icons/simple-icons/blob/develop/LICENSE.md (CC0 1.0). Colors adapted for theme contrast; Swift's logo identifies the SwiftUI output, not a separately claimed SwiftUI mark.
- Motion: official SVG from https://github.com/motiondivision/motion-vscode/blob/9c69b47beb0b658cf495e5a01c29bf8a4241376e/images/logo.svg . Its repository LICENSE covers this file under MIT (Copyright 2025 Motion Division Ltd); notice reproduced in THIRD_PARTY_NOTICES.md. Adaptations: remove the outer square subpath and apply theme colors. Mark coordinates are unchanged. Used for destination identification; no affiliation implied.
- CSS Bézier, CSS linear(), DTCG: original semantic curve/braces symbols; not claimed as official logos.

Brand names and trademarks remain their owners' property; collection dedications do not grant trademark rights.

## Component posters

Generated from the same RGBA renderer as the GIFs via `scripts/retina-preview-proof.ts --posters`, at 680×352 for both appearances. They depict the settled component, not another easing curve. Their geometry is independent of easing; the separate response graph describes the current input.

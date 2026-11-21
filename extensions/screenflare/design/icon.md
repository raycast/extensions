# Screenflare extension icon

Concept: **Capture the flare**. An amber screen frame opens at its upper-right corner, where a four-point flare completes its silhouette. A dark warm charcoal tile provides contrast in Raycast. The mark uses Screenflare’s screen-capture subject and warm color family with its own composition.

- Method: built-in `image_gen` tool; no reference image.
- Source: [icon-source.png](icon-source.png), preserved at the generated resolution.
- Production asset: [../assets/screenflare-icon-9bd8e9e3.png](../assets/screenflare-icon-9bd8e9e3.png), 512 × 512 PNG with alpha, exported using `sips`.
- Visual checks: 32 px and 16 px exports retain the screen outline and flare. The exterior is transparent.
- The manifest’s `icon` reference includes the first eight SHA-256 digits of the PNG. When changing the image, rename the asset to match its new digest and update the manifest; `tests/icon.test.ts` checks this. Changing the asset path prevents Raycast from retaining the old decoded image.

## Exact generation prompt

```text
Use case: logo-brand. Asset type: final production Raycast extension icon for Screenflare, a macOS screen capture and recording tool. Create ONE distinctive icon, not a sheet, no mockup, no lettering. Visual concept: 'capture the flare': a bold warm amber-orange rounded rectangular aperture/frame, with a decisive opening at its upper-right corner where a single chunky four-point cream-gold flare completes the corner. Make the negative space read as a screen, with a strong continuous frame on the other three sides. The frame and flare form one coherent memorable silhouette, with very few elements. Place this glyph on a near-black warm charcoal rounded-square app tile, with a very subtle plum undertone; luminous amber front face, quiet orange edge shading, refined minimal depth, absolutely no lens circles, no camera body, no rainbow, no tiny capture brackets, no scattered sparkles, no fine lines. Premium contemporary macOS utility aesthetic, bold optical geometry, restrained warm material finish, clean anti-aliased edges. The glyph must remain identifiable at 16/32 pixels. Frontal orthographic view, perfectly square composition, tile fills 92% of the canvas and glyph fills about 70% of the tile with generous even inner padding. Actual transparent background outside the rounded-square tile; all tile interior is opaque. No drop shadow outside tile. Deliver an isolated square 1024x1024 icon. No text, no border labels, no watermarks.
```

Tool setting: `transparent_background: true`.

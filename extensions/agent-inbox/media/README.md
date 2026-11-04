# Brand assets

## Product logo

The project owner supplied `logo-original.svg`; its metadata credits Arrow by QuiverAI. The original file is preserved verbatim. `logo.svg` retains its geometry and colors the crab warm terracotta (`#D97757`) with dark eyes.

`app-icon.svg` and `app-icon@dark.svg` add pale apricot and charcoal backgrounds. The 512 × 512 PNG copies here appear in both README languages; identical exports under `assets/` are used by Raycast. Raycast selects `agent-inbox-icon@dark.png` automatically in its dark theme. The third-party marks remain identifiable as source brands.

`menu-bar-icon.svg` extracts the envelope outline with transparent cutouts, exported at 44 × 44 to `assets/menu-bar-icon.png`. Raycast applies the theme-aware tint. Backgrounds and small agent marks are omitted from this tiny variant.

Re-export the SVG sources with a renderer supporting gradients and transparency. These exports use resvg. Keep runtime and README PNG pairs identical.

## Platform icons

These local SVG labels identify the supported host (Raycast) and operating system (macOS). They are documentation assets and are not included in the Raycast extension bundle.

The brand paths are copied unchanged from [Simple Icons at `b45ca1f`](https://github.com/simple-icons/simple-icons/tree/b45ca1f11d9d013a7c462944d90a049bc613ad4f):

- [Raycast](https://github.com/simple-icons/simple-icons/blob/b45ca1f11d9d013a7c462944d90a049bc613ad4f/icons/raycast.svg), shown in Raycast red.
- [Apple](https://github.com/simple-icons/simple-icons/blob/b45ca1f11d9d013a7c462944d90a049bc613ad4f/icons/apple.svg), shown in white to identify macOS.

Simple Icons distributes these paths under [CC0 1.0](https://github.com/simple-icons/simple-icons/blob/b45ca1f11d9d013a7c462944d90a049bc613ad4f/LICENSE.md). Brand names and trademarks remain with their respective owners; these labels indicate compatibility, not endorsement. The label frames and text are part of this project's documentation.

Both README languages use the same local files, with linked destinations and descriptive alt text. The dark backgrounds preserve contrast in light and dark README themes.

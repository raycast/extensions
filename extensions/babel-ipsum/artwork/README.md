# Babel Ipsum artwork

**Library Rascal — Vermilion** is the official identity: a sly cat-shaped document with a near-black copy sheet behind it, printed in vermilion ink on warm ivory paper.

| Asset                                         | Location                                                  |
| --------------------------------------------- | --------------------------------------------------------- |
| Icon master, 1254 × 1254 lossless WebP        | [icon-master.webp](icon-master.webp)                      |
| Promotional poster, 1536 × 1024 lossless WebP | [media/poster.webp](../media/poster.webp)                 |
| Runtime icon, 512 × 512 PNG                   | [assets/extension-icon.png](../assets/extension-icon.png) |
| Exact imagegen prompts and provenance         | [PROMPTS.md](PROMPTS.md)                                  |

The masters were generated with the built-in imagegen tool under Astra's art direction. Lossless WebP conversion preserves their decoded pixels exactly. The poster is an illustration, not a screenshot of the extension. Its catalog counts are 13 books and 12 languages. The poster inherits the icon's palette, letterpress shapes, and ink wear; its emblem is a generated interpretation rather than a pixel-exact insertion of the icon.

## Rebuild the runtime icon

Install [ImageMagick](https://imagemagick.org/script/download.php), then run from the repository root:

```sh
npm run artwork:build
```

This resizes the WebP icon master to 512 × 512, applies an antialiased 128-pixel corner radius with transparent corners, and writes `assets/extension-icon.png`. The WebP master and poster stay unchanged. The PNG remains checked in so normal extension builds need no image tools. The poster lives only in `media/` for Raycast README support; the icon master lives here. Separate inspection derivatives are not retained.

## Palette

Palette targets: burnt vermilion `#D74925` for the cat document and emphasis, near-black `#24221D` for the rear sheet and supporting type, and warm ivory `#F4E9D4` for paper and negative space. These are generation targets, not measured ink coverage or pixel-perfect color claims.

The current poster tagline is "Borrow a little brilliance." Its approved copy refresh, before poster, selected PNG master, and exact edit prompt are archived in `.artwork-explorations/library-rascal-copy-refresh-r1/`; the edit prompt and provenance are also appended to [PROMPTS.md](PROMPTS.md).

The retired Forest Monochrome set, unused concepts, palette comparisons, and the historical mining-lamp artwork remain locally in the Git-ignored `.artwork-explorations/` directory.

# Library Rascal — Vermilion generation prompts

The selected icon and poster were generated with the built-in imagegen tool under Astra's art direction. The prompts below are preserved verbatim from the review sets. Paths are historical references: the poster input at `media/poster.webp` was the earlier Forest Monochrome design, now archived locally in `.artwork-explorations/retired-forest-monochrome/`.

## Icon prompt record

# Option 02 — Mischievous library stamp

Mode: built-in imagegen only. New generation from the inspected SVG concept; no image input attached.

Reference: `.artwork-explorations/yoink-sketches/03-copycat.svg`; rendered to `reference.png` for visual inspection.

Tool parameters: `transparent_background: false`; no referenced images.

## Exact generation prompt

Use case: logo-brand
Asset type: ONE finished square app-icon proposal for Babel Ipsum, Option 02, review only.
Primary request: Reimagine a cat merged with copied document pages as a mischievous library stamp. Create a polished, distinctive letterpress / woodcut icon, with a strong graphic silhouette that is readable at 32 pixels.
Concept reference: the supplied local SVG depicts a cat-shaped front document, an offset duplicate sheet behind it, simple happy face, and two horizontal text bars. Use this concept only; freely redesign its silhouette and proportions. Do not reproduce its forest-green color scheme.
Subject and composition: A large warm-vermilion cat-document silhouette, confidently centered on a solid warm-ivory square. Its pointed ears form the top edge of the front page; its lower body is a broad rectangular document with slightly irregular softened corners. Behind it, one visibly offset duplicate document in near-black ink, with a generous ivory separation so two copied sheets read instantly at tiny size. A sly asymmetrical cat face is carved into the vermilion front page with simple bold ivory negative-space shapes: one knowingly narrowed eye and one cheerful curved eye, a small nose and compact cheeky smile. Below the face, exactly two chunky unequal horizontal ivory bars signify text without letters. The copy metaphor is integral to the mark, not a separate accessory.
Style/medium: contemporary editorial letterpress emblem, almost woodcut / rubber library stamp. Bold simplified shapes, hand-cut confidence, very slight uneven ink edges and restrained tiny ink wear, mostly solid ink. Warm, playful, a little mischievous, beautifully balanced, not distressed or busy.
Color palette: warm ivory background approximately #F4E9D4; vivid burnt-vermilion approximately #D74925 for the cat-page; near-black warm ink approximately #24221D for the rear sheet. Use only these three colors and their antialiasing.
Framing: square 1024x1024, full-bleed opaque ivory background, generous consistent outer breathing room around a single large mark. Flat face-on artwork, no presentation mockup.
Text: none. The only text-like marks are the two broad horizontal bars; no actual letters, numbers, words or unreadable glyphs.
Constraints: one coherent iconic cat+copy symbol, obvious ears and two overlapping sheets; thick shapes and spacious negative spaces that survive downscaling to 32 px. Keep personality bold and simple. No extra objects, no paws holding props, no bookshelves, no stamp border, no circular seal, no badge lettering, no whisker clutter, no fine hatching, no extra tiny details. No gradients, no 3D, no cast shadows, no photorealistic paper, no watermark. Output just the finished square icon.

## Poster prompt record

# Vermilion poster generation

Built-in `image_gen` only; one requested output. `transparent_background: false`.
References supplied in the order listed in the prompt. No API or CLI image generation.

## Exact generation prompt

```text
Use case: ads-marketing
Asset type: ONE finished promotional poster, flat artwork, 1536 x 1024 pixels, landscape 3:2, fully opaque.
Primary request: Rework the attached Babel Ipsum poster into the Vermilion Library Rascal identity. This is one review-only poster, not a mockup.

Input images:
Image 1 (/Users/felipe/code/vibed-ipsum/media/poster.webp): existing poster to recompose; reference for content, editorial hierarchy, and the simple one-book-to-passages-and-sentences explanation. Replace its green palette and old open-book brandmark.
Image 2 (/Users/felipe/code/vibed-ipsum/.artwork-explorations/library-rascal-palettes-r1/vermilion/master.png): authoritative selected logo and styling reference. Reproduce this exact cat-document character as closely as possible for the sole brandmark: burnt-vermilion upright sheet with two triangular cat ears; viewer-left half-lidded sly eye and viewer-right upward-curved closed wink; small ivory triangular nose and curved smiling muzzle; exactly two ivory horizontal document bars, upper longer than lower; offset near-black copy sheet behind it with warm ivory separation, visible to the right and below and as a small dark wedge above. Preserve the emblem's distinctive proportions, asymmetric expression, silhouette, and offset sheet. Do not redesign it into another cat.

Style/medium: sophisticated printed editorial poster, carved letterpress shapes, bold readable editorial serif typography, subtle ink wear, warm ivory paper. Inherit the selected logo's burnt-vermilion, near-black and warm-ivory palette throughout. Flat printed art with restrained texture and ample breathing room.
Composition: large readable Babel Ipsum title and tagline in a generous upper band, cat-document brandmark beside the title. Below, a clear infographic: compact count area with 13 books and 12 languages; one simple book-source illustration labeled One book branches via printed arrows into Passages (three short paragraph blocks made only of abstract ink bars) and Sentences (two distinct long line bars). A simple open-book shape may appear solely as the lower book source illustration, never as a brandmark. Use a balanced spacious composition and clean reading order.
Text (verbatim, each exactly once, only these seven strings):
"Babel Ipsum"
"Classic literature. Any layout."
"13 books"
"12 languages"
"One book"
"Passages"
"Sentences"
Constraints: Exact spelling, capitalization, numerals, and punctuation. Legible professionally spaced typography. Count labels may wrap between number and noun. No other text, no multilingual gibberish, no fake words inside the diagram. No UI, screenshot, browser, store presentation, photo, frame, watermark, or 3D mockup. No green. Full bleed opaque warm ivory canvas; retain comfortable margins. Render at exactly 1536 x 1024.
```

## References

- Poster: `/Users/felipe/code/vibed-ipsum/media/poster.webp`.
- Logo: `/Users/felipe/code/vibed-ipsum/.artwork-explorations/library-rascal-palettes-r1/vermilion/master.png`.

## Checks

See README.md for the final visual and file checks, conversion method, and fidelity limitations.

## Adopted assets

- `artwork/icon-master.webp`: lossless conversion of the selected 1254 × 1254 PNG icon master.
- `media/poster.webp`: selected 1536 × 1024 lossless poster, copied unchanged.
- `assets/extension-icon.png`: 512 × 512 runtime derivative of the retained icon master, with an antialiased 128-pixel corner radius and transparent corners applied during conversion.

Conversion and rebuild:

```sh
cwebp -lossless -exact -m 6 .artwork-explorations/library-rascal-palettes-r1/vermilion/master.png -o artwork/icon-master.webp
npm run artwork:build
```

Decoded-pixel parity is verified against each selected PNG master. The poster's generated cat emblem is visually consistent with the icon but is not pixel-exact. Alternate palettes and former official artwork remain in the ignored explorations folder.

## Approved poster tagline refresh (2026-10-23)

The official poster now reads "Borrow a little brilliance." The user approved replacing only the previous tagline. This was a focused built-in `image_gen` edit of the inspected official `media/poster.webp`, with `transparent_background: false` and that file as the sole referenced image. No API or CLI image generation was used.

The historical prompts above remain unchanged. This section records the exact edit prompt and the selected output.

### Exact edit prompt

```text
Use case: text-localization
Asset type: Official Babel Ipsum promotional poster, flat opaque artwork, exactly 1536 x 1024 pixels.
Input images: Image 1 is the existing official media/poster.webp and is the edit target.
Primary request: Make a focused text-only edit. Replace the existing tagline "Classic literature. Any layout." with EXACTLY "Borrow a little brilliance." in the same location beneath the Babel Ipsum title. Match the existing bold editorial serif font style, size, baseline, black ink, and typographic hierarchy. Keep its left alignment.
Preserve everything else in the edit target: the Babel Ipsum title, Vermilion Library Rascal cat-document header emblem with its sly face and offset black copy sheet, all other lettering, black and vermilion ink, warm ivory paper, letterpress texture, book-to-output diagram, arrows, illustrations, spacing, layout, margins, and canvas dimensions. Do not redesign or recompose any element.
Text (verbatim, only these seven strings, each exactly once):
"Babel Ipsum"
"Borrow a little brilliance."
"13 books"
"12 languages"
"One book"
"Passages"
"Sentences"
Constraints: Change only the tagline. Preserve number-and-noun line wrapping for the counts. No em dashes. No other new copy. No long description, added objects, new logo, watermark, or border. Full-bleed opaque warm ivory background. Output exactly 1536 x 1024.
```

### Provenance and archive

- Edit target: `media/poster.webp` as it existed immediately before this refresh.
- Built-in generated source: `/Users/felipe/.codex/generated_images/01a16769-a754-7362-ae64-ee40da212278/exec-044dafe9-5b30-46e3-9c21-a04df0102f38.png`.
- Ignored archive: `.artwork-explorations/library-rascal-copy-refresh-r1/`.
- Before poster: `before-poster.webp`.
- Selected generated master: `generated-master.png`.
- Exact prompt: `edit-prompt.txt`.
- Lossless conversion: `selected-poster.webp`, copied to the official `media/poster.webp`.

```sh
cwebp -lossless -exact -m 6 .artwork-explorations/library-rascal-copy-refresh-r1/generated-master.png -o .artwork-explorations/library-rascal-copy-refresh-r1/selected-poster.webp
```

### Verification

- Visual inspection: exact new tagline; Babel Ipsum, 13 books, 12 languages, One book, Passages, and Sentences retained; no em dashes or added copy.
- Visual inspection: cat-document header emblem, serif hierarchy, black and vermilion ink, warm ivory paper, letterpress texture, book-to-output diagram, and layout retained. A generative edit can vary individual texture pixels; this is not a claim of pixel parity with the before poster.
- Both selected PNG and WebP: 1536 × 1024, fully opaque.
- PNG-to-WebP decoded-pixel comparison: zero differing pixels.
- Application checks and live verification skipped as requested; no application code changed.

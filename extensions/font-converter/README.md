# Font Converter

Convert local font files, preview their glyphs and metadata, and generate `@font-face` CSS in Raycast on macOS and Windows.

## Supported formats

| Input                      | Output                |
| -------------------------- | --------------------- |
| TTF, OTF, WOFF, WOFF2, EOT | TTF, WOFF, WOFF2, EOT |

OTF is supported as an input. Creating OTF output, SVG fonts, font collections, and CFF2 outlines is not supported.

WOFF and WOFF2 conversions preserve the source font's CFF or TrueType outlines and embedded tables. Converting CFF outlines to TTF or EOT approximates the curves and may change hinting or advanced layout tables. The conversion command and AI tool report this warning. Use WOFF or WOFF2 when retaining the original font data matters.

## Commands

- **Convert Font** saves a converted file beside the source font. Existing files are never overwritten. Move or rename an existing output before converting again. After conversion, reveal the output in Finder or File Explorer, or copy its path.
- **Generate @Font-Face CSS** copies a CSS rule using the font's family, weight, style, and correct format descriptor.
- **Preview Font** renders sample text and shows the font's family, style, format, outlines, glyph count, and other metadata.

On macOS, select a font in Finder before opening a command to use it immediately. A file picker appears when no supported file is selected. On Windows, choose the font with the file picker. Each command also offers **Choose Another Font**.

## AI tools

AI tools are available where Raycast supports AI extensions. Mention `@font-converter` and provide the exact local file path.

- "Convert `/Users/me/Fonts/Example.otf` to WOFF2."
- "Convert `C:\Users\me\Fonts\Example.otf` to WOFF2 and save it in `C:\Users\me\WebFonts`."
- "Inspect `/Users/me/Fonts/Example.woff2` and tell me its family, weight, and glyph count."
- "Generate @font-face CSS for `/Users/me/Fonts/Example.woff2`."

The conversion tool asks for confirmation before saving a new file. An optional output directory must already exist. Metadata and CSS tools only read the file. The CSS tool returns text to the conversation; it does not copy to the clipboard. AI tools require an explicit file path and do not read the current Finder selection.

## Development

```sh
npm install
npm test
npx tsc --noEmit
npm run lint
npm run build
```

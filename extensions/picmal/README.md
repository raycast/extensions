# Picmal for Raycast

Convert and compress images, audio, and video right from Raycast — powered by the
[Picmal](https://picmal.app) macOS app and its bundled FFmpeg, ImageMagick, and sips tooling.

## Commands

- **Convert Files** — Convert the selected files to another format (any of Picmal's
  supported image, audio, and video formats). A pure format change at maximum quality by
  default, with an optional **Compress after converting** option and metadata stripping.
- **Compress Files** — Compress files while keeping their format, optionally driven by
  one of Picmal's built-in or custom presets.
- **Combine PDFs** — Merge two or more PDFs into a single PDF, in the order shown.
- **Split PDF** — Split a PDF into one document per page range (`1-3, 5, 8-`), or one PDF
  per page.
- **Images to PDF** — Build a multi-page PDF from images (one image per page) with a
  page-size and quality choice and an optional open password.
- **Merge Audio** — Join two or more audio files into one track, losslessly when they
  share a format.
- **Combine Videos** — Join two or more videos into one, losslessly when the clips match.
- **Generate App Icons** — Turn one image into a macOS `.icns`, a Windows `.ico`, and an
  iOS icon set.

Every command prefills from your current Finder selection. Convert and compress write next
to each input (compress adds a `_compressed` suffix); the merge, combine, and PDF commands
write a single new file next to the first input; **Generate App Icons** writes a folder of
icons next to the source. A toast reports the result with a **Show in Finder** action.

## AI Tools

With Raycast AI you can run any of these without opening a command — e.g. _"@picmal convert
these to webp"_, _"@picmal compress the selected videos"_, _"@picmal combine these PDFs"_,
or _"@picmal make a PDF from these photos."_ Each action asks for confirmation, then reports
the output paths (and size savings for convert/compress).

- **Convert Files** — convert files to a target format.
- **Compress Files** — compress files (optionally with a preset) while keeping their format.
- **Combine PDFs** — merge two or more PDFs into one.
- **Split PDF** — split a PDF into one document per page range.
- **Images to PDF** — create a multi-page PDF from images.
- **Combine Videos** — join two or more videos into one.
- **Generate App Icons** — generate macOS, Windows, and iOS app icons from one image.

## Requirements

- [Picmal](https://picmal.app) installed (the extension shells out to the `picmal-cli`
  binary bundled inside `Picmal.app`).
- An active Picmal license — the same gate the app uses. If you're unlicensed, the
  extension links you to activation.

## How it works

The extension locates `Picmal.app` via Spotlight (`com.cantimplorastudio.picmal`) and runs
its bundled CLI at `Contents/MacOS/picmal-cli`, parsing the CLI's stable NDJSON output for
results, errors, and live progress on long video transcodes. No separate install,
configuration, or API key required.

## Development

```sh
npm install
npm run dev    # ray develop — loads the extension into Raycast
npm run lint
npm run build
```

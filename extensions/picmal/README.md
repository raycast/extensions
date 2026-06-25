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
- **Images to PDF** — Build a multi-page PDF from images (one image per page) with a
  page-size and quality choice and an optional open password.

Every command prefills from your current Finder selection. Convert and compress write next
to each input (compress adds a `_compressed` suffix); the PDF commands write a single new
PDF next to the first input. A toast reports the result with a **Show in Finder** action.

## AI Tools

With Raycast AI you can run any of these without opening a command — e.g. _"@picmal convert
these to webp"_, _"@picmal compress the selected videos"_, _"@picmal combine these PDFs"_,
or _"@picmal make a PDF from these photos."_ Each action asks for confirmation, then reports
the output paths (and size savings for convert/compress).

- **Convert Files** — convert files to a target format.
- **Compress Files** — compress files (optionally with a preset) while keeping their format.
- **Combine PDFs** — merge two or more PDFs into one.
- **Images to PDF** — create a multi-page PDF from images.

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

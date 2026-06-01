# Picmal for Raycast

Convert and compress images, audio, and video right from Raycast — powered by the
[Picmal](https://picmal.app) macOS app and its bundled FFmpeg, ImageMagick, and sips tooling.

## Commands

- **Convert Files** — Convert the selected files to another format (any of Picmal's
  supported image, audio, and video formats). A pure format change at maximum quality by
  default, with an optional **Compress after converting** option and metadata stripping.
- **Compress Files** — Compress files while keeping their format, optionally driven by
  one of Picmal's built-in or custom presets.

Both commands prefill from your current Finder selection. Output is written next to each
input (compress adds a `_compressed` suffix), and a toast reports the size savings with a
**Show in Finder** action.

## AI Tools

With Raycast AI you can convert and compress without opening a command — e.g. _"@picmal
convert these to webp"_ or _"@picmal compress the selected videos."_ Each action asks for
confirmation, then reports the output paths and size savings.

- **Convert Files** — convert files to a target format.
- **Compress Files** — compress files (optionally with a preset) while keeping their format.

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

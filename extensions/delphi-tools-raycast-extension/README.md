# Delphitools

Run local design and text utilities from [delphitools](https://tools.rmv.fyi/) in Raycast.

## Commands

- Encode Text
- Decode Text
- Hash Text
- Check Contrast
- Generate Color Harmony
- Palette Generator
- Simulate Color Blindness
- Simulate Color Blindness (Image)
- Generate Barcode
- QR Code Generator
- QR Code Generator vCard
- Trim Transparent Edges
- Convert Images
- Favicon Generator
- Social Media Cropper
- Seamless Scroll Generator
- Image Splitter
- Print Imposer
- Matte Generator
- Meta Tag Generator
- Add Noise to Images
- Watermarker
- Generate Tailwind Shades
- Compute Line Height
- Paper Sizes
- Font File Explorer
- Transliterate to Shavian
- Regex Tester
- PDF Preflight
- Image Tracer
- SVG Optimiser
- Zine Imposer
- Background Remover

## Setup

This extension uses the local `delphitools` CLI. Install it before running commands that call delphitools:

```sh
cargo install delphitools-cli
```

## Requirements

- Raycast
- Rust and Cargo, used to install the local `delphitools` CLI

## Notes

All processing runs locally through the CLI. Generated previews are temporary local files and do not require a web server.

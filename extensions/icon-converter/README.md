# Icon Converter

Convert icons and images between SVG, PNG, JPG, WebP, HEIC, AVIF, ICO and PDF, one command per conversion.

Everything runs on your computer: no uploads, no account, no rate limits.

## Commands

| From | To                       |
| ---- | ------------------------ |
| SVG  | PNG, JPG, WebP, PDF, ICO |
| PNG  | JPG, WebP, SVG, ICO      |
| JPG  | PNG, WebP, SVG, ICO      |
| WebP | PNG, JPG, SVG            |
| HEIC | PNG, JPG                 |
| AVIF | PNG, JPG, WebP           |

## How to use

1. Select files in Finder (or File Explorer) and run a command, such as **SVG to PNG**. The selection is filled in for you; you can also pick files in the form.
2. Adjust the options the conversion offers (output width for SVG input, quality for JPG and WebP, background colour for JPG, number of colours when tracing to SVG).
3. Press `⌘ ↵`. The converted file is saved next to the original and never overwrites an existing file.

## Notes

- **To SVG** traces the image into flat colour shapes. It works well for logos and icons and poorly for photos.
- **To ICO** creates one file containing 16, 24, 32, 48, 64, 128 and 256 px versions. Non-square images are centred on a transparent background.
- **SVG to PDF** keeps the artwork as vectors on a page the size of the SVG.
- Text in SVG files is drawn with a system font (Helvetica or Arial), so convert text to outlines if the exact typeface matters.

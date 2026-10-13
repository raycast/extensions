# OCR to Clipboard Changelog

## [Initial Version] - {PR_MERGE_DATE}

- `Capture Text`: drag-select a screen area, OCR it with Apple Vision, copy the result.
- `Copy Text from Clipboard Image`: OCR an image already on the clipboard.
- `Copy Text from Selected Files`: OCR images and PDFs selected in Finder.
- QR codes and barcodes are decoded alongside the text.
- Table-aware output: cells on the same row are tab-separated, paragraphs are preserved.
- Vision is warmed up during the selection so recognition starts the moment the capture ends.
- Second recognition pass at a smaller scale on large tabular captures, to catch short tokens Vision skips.
- Defaults to the Mac's languages, with a language dropdown and advanced overrides.
- Confirmation by system sound, HUD message, both, or nothing.
- Screen Recording permission is requested on first use, with a shortcut to System Settings.

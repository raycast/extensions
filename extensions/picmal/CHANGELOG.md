# Picmal Changelog

## [New Tools] - 2026-07-16

- Added **Merge Audio** — join two or more audio files into one. Same-format files are joined losslessly; mixed formats are re-encoded to match the first file.
- Added **Combine Videos** — join two or more videos into one. Matching clips are joined losslessly; mismatched ones are scaled and re-encoded to match the first.
- Added **Split PDF** — split a PDF into one document per page range (`1-3, 5, 8-`), or leave the ranges blank to split every page separately.
- Added **Generate App Icons** — turn one image into a macOS `.icns`, a Windows `.ico`, and an iOS icon set, written to a new folder next to the source.
- **Combine Videos**, **Split PDF**, and **Generate App Icons** also ship as AI tools, so Raycast AI can run them from a plain-English request.

## [AI Tools & Initial Release] - 2026-07-16

- Added **Convert Files** and **Compress Files** AI tools, so Raycast AI can convert and compress your selection with confirmation.
- Convert and Compress commands that prefill from the current Finder selection.
- Convert is a pure format change at maximum quality by default, with an optional **Compress after converting** option that also shrinks the output (mirrors the Picmal app).
- Format and preset pickers restricted to what makes sense for the selected media type.
- Quality, metadata stripping, and overwrite options, with per-extension defaults in preferences.
- Live progress for long audio/video transcodes and a size-savings report with **Show in Finder**.
- Added **Combine PDFs** and **Images to PDF** commands (and matching AI tools) for Picmal's PDF tools — merge PDFs in order, or build a multi-page PDF from images with page-size, quality, and optional password.

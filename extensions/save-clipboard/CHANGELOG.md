# Save Clipboard As Changelog

## [Fix Native Clipboard Images] - {PR_MERGE_DATE}

- Fix detecting and saving screenshots and images copied as native clipboard data without a file path

## [Initial Version] - 2026-05-05

- Save images, files, text, and HTML content from your clipboard to disk
- Automatic file type detection via magic bytes (JPG, PNG, GIF, BMP, TIFF, WebP)
- Images are converted to JPEG using `sips`
- Smart filename suggestions with timestamps for screenshots and clipboard content
- Configurable default save directory
- Automatic unique filename resolution to prevent overwrites

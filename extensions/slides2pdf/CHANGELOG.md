# Slides2PDF Changelog

## [Initial Version] - {PR_MERGE_DATE}

- Convert slides, documents, spreadsheets, images, and text or code files selected in Finder to PDF
- Uses locally installed apps as conversion engines: Keynote, PowerPoint, Pages, Word, Numbers, Excel, LibreOffice, and sips
- Text-based files (code, JSON, Markdown, logs, …) are rendered by a bundled text renderer — no apps required
- Format-native engine is tried first, with automatic fallback to the next capable engine
- Existing files are never overwritten — name collisions get an extension tag or numeric suffix
- Everything runs on-device — no cloud service, no upload, no account
- Live progress in the toast during batch conversions (current file and x/y counter)
- Stop Conversion command ends a batch after the file it is working on
- Setup command shows detected engines and lets you pick a preferred engine per file type

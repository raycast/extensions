# Clean Agent Text Changelog

## [Fix Windows Clipboard Reading] - {PR_MERGE_DATE}

- Read the clipboard's text slot explicitly so a file reference on the clipboard (common when copying from web pages on Windows) no longer gets pasted back as a filename
- Show a clearer HUD message when the clipboard holds a file instead of text

## [Initial Version] - 2026-04-15

- Clean box-drawing characters from clipboard text
- Strip pipe borders from AI agent TUI output
- Auto-detect text vs code mode
- Text mode collapses wrapped lines into paragraphs
- Code mode preserves structure and normalizes indentation

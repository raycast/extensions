# paste.rs Changelog

## [Language and Selected Text] - {PR_MERGE_DATE}

- Add supported language options for highlighted paste URLs and rendered Markdown, with plain text as the default.
- Add Paste Selected Text with public-upload confirmation and empty/unavailable selection handling.
- Remove the tagline from the extension title.
- Validate service URLs, preserve language URLs in clipboard/history, and delete highlighted pastes by their underlying ID.
- Handle request timeouts and distinguish clipboard-copy failures from local history failures.

## [Initial Version] - 2026-07-06

- Create Paste: upload manually entered text and copy the resulting URL
- Paste Clipboard: upload clipboard text and copy the URL
- Recent Pastes: browse locally saved pastes, copy the URL or content back, delete a paste on paste.rs, or remove it from local history
- Warns when a paste is only partially uploaded (`206 Partial Content`)

# Litterbox Changelog

## [Finder Uploads and Safer History] - {PR_MERGE_DATE}

- Add Upload Selected Finder Files on macOS, with an editable file selection and expiry before uploading.
- Check every selected file for readability, regular-file type, the 1 GB limit, and Litterbox’s prohibited extensions before starting a batch.
- Preserve successful upload links in history even if copying to the clipboard fails, and remove successful files from the selection before a retry.
- Require confirmation before clearing recent uploads, explaining that only local history is removed.

## [Initial Version] - 2026-03-23

# File Tidy Changelog

## [Initial Version] - {PR_MERGE_DATE}

- **Tidy Folder**: archive a folder's files into `Type/Year-Month` buckets (EXIF capture date for photos and videos when available), with byte-level duplicate detection (size → head/tail hash → full SHA-256) that quarantines identical files instead of archiving them twice. Always shows the full plan for confirmation before moving anything.
- **Undo Last Tidy**: move every file from the last run back to its original location and clean up emptied folders.
- Optional in-place mode (category folders inside the source folder), subfolder recursion, and a configurable default destination.

# Aktar Changelog

## [Delete After] - 2026-09-30

- Delete After option (1, 7, 14, or 30 days) for Upload Clipboard, Upload Selected Files, and Upload File. Aktar puts the file under a `tmp/` folder whose bucket lifecycle rule deletes it on schedule. Needs Aktar 0.5.0 or later
- Search Uploads shows when an expiring upload will be deleted
- Clearer messages when auto-delete isn't set up for the destination yet, with a shortcut to Aktar's settings

## [Initial Version] - 2026-09-28

- Upload Clipboard, Upload Selected Files, and Upload File commands
- Search Uploads with previews, copy formats, and delete
- Browse Buckets: folders, public and temporary links, rename, move, delete, new folder, and upload into a folder
- Connect to Aktar: one-click pairing with the Aktar app
- AI tools to list destinations, search uploads, list bucket files, and create temporary links

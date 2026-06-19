# Changelog

## [Initial Version] - 2026-04-21

- Initial release of Tflink Tmpfile extension.
- Added `upload` command to upload clipboard content (files/text) to tmpfile.link.
- Implemented strict privacy (7-day retention).
- Added result view with QR Code and copy actions.
- Fixed issue where clipboard images were uploaded with generic names (e.g., "Image (...)").
- Added sanitization for all filenames to ensure URL safety.
- Added automatic extension detection for clipboard images (png/jpg).
- Replaced remote QR code API with local generation for better privacy and offline support.

## [Initial Release] - 2026-05-20

- Added the Align RTL command to paste selected text or clipboard content as right-aligned rich RTL content.
- Added a rich HTML clipboard payload with `dir="rtl"`, `direction: rtl`, and `text-align: right` for editors that accept rich paste data.
- Added a plain-text Unicode RTL fallback for apps that do not accept HTML clipboard content.

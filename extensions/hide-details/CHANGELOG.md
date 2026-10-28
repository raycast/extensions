# Hide Details Changelog

## [Windows Scan Fix and Face Blur] - 2026-10-22

- Fix a PowerShell parsing error that prevented Windows scans and clipboard operations from starting.
- Add a **Blur Faces** preference on macOS and Windows to blur detected faces while keeping the selected redaction style for text. It is off by default and requires **Faces** to be enabled in **What to Hide**.
- Keep overlapping text masks covered when face blur is enabled.

## [Windows Support and Clipboard History] - 2026-10-19

- Add Windows support with on-device Windows OCR and face detection.
- Add **Redact Image File from History** to pick a recently copied image file, then review it or copy a redacted version.
- When the clipboard has no image, use the newest copied image file in recent history. Screenshot images stored only in history are unavailable.
- Keep Windows text masks aligned with rotated text and resized OCR images.

## [Review Controls] - 2026-10-12

- Add per-detection Don't Redact / Redact actions and restore-all control, with scan-specific selections and synchronized preview/copy output.
- Configure What to Hide with checkboxes shared by both commands, preserving legacy category preferences and offering a reversible migration.
- Retain an encrypted temporary snapshot during review so exclusions can be reversed without rereading the clipboard; remove it when the scan closes.

## [Initial Version] - 2026-10-08

- Redact sensitive details in clipboard images using on-device text and face detection.
- Preview the redacted image and detections, copy from any row, or redact immediately with a hotkey.
- Use blackout by default, or choose pixelation or blur. Configure categories, padding, and words to hide with validation for invalid settings.
- Scan clear screenshots with Fast text recognition and retry the current clipboard with Accurate OCR for small or difficult text.
- Detect sensitive text even when OCR inserts spaces into email addresses, token prefixes, or custom words.
- Add custom regex rules for internal IDs, invoice numbers, and other text patterns in both redaction commands.
- Detect cards with dot separators or beside expiry dates, phones beside ticket numbers or IPv4 addresses, and adjacent phone numbers.
- Detect valid IPv4 addresses beside other text, including spaces around dots.
- Avoid reporting digits inside secret keys as phone or card numbers, and optionally hide OCR confidence percentages in the review list.
- Mask recognized text in detection labels while reviewing images during screen sharing.
- Copy finished images even when the previous clipboard advertises unavailable formats.
- Build and package native code through Raycast's Swift integration without a checked-in executable.
- Keep previews independent, process clipboard input in memory, clean temporary output, restore readable clipboard content after rejected image writes, and preserve newer clipboard content during automatic processing.

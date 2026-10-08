# Hide Details Changelog

## Initial Version - {PR_MERGE_DATE}

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

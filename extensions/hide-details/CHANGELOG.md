# Hide Details Changelog

## Initial Version - {PR_MERGE_DATE}

- Redact sensitive details in clipboard images using on-device text and face detection.
- Preview the redacted image and detections, copy from any row, or redact immediately with a hotkey.
- Use blackout by default, or choose pixelation or blur. Configure categories, padding, and words to hide with validation for invalid settings.
- Scan clear screenshots with Fast text recognition and retry the current clipboard with Accurate OCR for small or difficult text.
- Detect sensitive text even when OCR inserts spaces into email addresses, token prefixes, or custom words.
- Add custom regex rules for internal IDs, invoice numbers, and other text patterns in both redaction commands.
- Detect cards beside expiry dates, phones beside ticket numbers or IPv4 addresses, and adjacent phone numbers.
- Avoid reporting digits inside secret keys as phone or card numbers, and optionally hide OCR confidence percentages in the review list.
- Keep previews independent, process clipboard input in memory, clean temporary output, and preserve newer clipboard content during automatic processing.

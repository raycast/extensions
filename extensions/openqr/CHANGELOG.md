# OpenQR Changelog

## [Fixes] - 2026-08-28

- Manage Dynamic QR Codes: a failed load (invalid API key, network error) now shows the error on the list with a Retry action, instead of looking like an empty account.

## [Initial Version] - 2026-08-28

- Generate Static QR Code: encode any text or URL, choose PNG or SVG, set the pixel size and optional foreground/background colors, then copy the image, save it, or open it.
- Generate Dynamic QR Code: create an editable `oqr.to` short link, copy it to the clipboard, and get the QR code image for it inline, ready to copy, save or open.
- Manage Dynamic QR Codes: browse your codes with the QR image shown for the selected row, copy or save it, re-point a destination, view scan analytics, and delete codes.
- Errors from the OpenQR API surface as readable toasts, including a specific message when the API key is missing or invalid.

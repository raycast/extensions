# Apfel Changelog

## [OCR & Streaming Chat] - 2026-05-27

### Added
- **Read Text from File** — extract text from images and PDFs via auge
- **Read Text from Clipboard** — OCR an image on the clipboard
- **Scan QR Code / Barcode** — decode QR/barcodes from clipboard or file; opens URLs directly
- **Read Text from Screen Area** — interactive region picker, copies result to clipboard
- Install screen for auge when not present (Homebrew one-click install)
- Streaming chat responses — text appears as apfel generates it

### Fixed
- Stale closure bugs in history, conversations, saved chat, and question hooks
- Removed dead `availableModels` state from model hook
- Replaced `cpus()[0]` check (crash risk) with `process.arch` for Apple Silicon detection

## [Initial Version] - 2026-05-11

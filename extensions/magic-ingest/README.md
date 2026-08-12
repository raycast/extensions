# Magic Ingest

Fast, background photo & video ingest from memory cards — built for photographers who want to get shooting, not waiting.

## Features

- **Instant card detection** — Automatically finds SD cards, CFexpress, and USB drives
- **Date filtering** — Pick which shoot days to import (scanned in under a second)
- **Star rating filter** — Import only rated images (via EXIF metadata)
- **Background ingest** — Runs independently of Raycast. Press Escape and keep working.
- **Multiple concurrent jobs** — Run up to 3 ingests in parallel; view and manage them from the Ingest Status screen
- **SHA-256 verification** — Optional checksum verification for every copied file
- **Smart collision handling** — Resolves filename conflicts across multiple cards
- **File renaming** — Prefix files with your folder name for easy organization
- **Photo Mechanic integration** — Opens your destination folder in PM6 when done
- **Auto-eject** — Safely ejects cards after ingest completes
- **Duplicate skipping** — Won't re-copy files already in the destination; hash-verifies on filename collision so reformatted-card filename resets don't silently overwrite
- **Sidecar-aware** — XMP sidecars follow their parent media files

## Requirements

- **macOS** (uses native `diskutil`, `rsync`, and notification APIs)
- **[ExifTool](https://exiftool.org/)** — Required for star rating filtering. Install via Homebrew:
  ```
  brew install exiftool
  ```
  If you don't use star rating filtering, ExifTool is not needed.

## Supported Formats

**Images:** CR2, CR3, ARW, NEF, DNG, JPG, JPEG, HEIC
**Video:** MP4, MOV, MXF
**Sidecars:** XMP

## Commands

| Command           | Description                                                           |
| ----------------- | --------------------------------------------------------------------- |
| **Magic Ingest**  | Open the ingest form — select cards, dates, and options               |
| **Ingest Status** | View all running and recently-finished ingest jobs; start new ingests |

## How It Works

1. Insert your memory card
2. Open **Magic Ingest** from Raycast
3. Select source card(s), destination, and date range
4. Hit submit — ingest runs in the background
5. Start another ingest immediately, or check progress via **Ingest Status**
6. Get a notification when done

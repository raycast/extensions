# Changelog

## [1.0.0] - 2026-07-28

### Added

- Initial release of **Tesla Clips** for managing Tesla dashcam and Sentry recordings.
- List-based UI with scan-then-act workflow: scan folders, preview events, then merge or remove merged outputs.
- **Merge Clips** action to combine split camera segments with FFmpeg.
- **Remove Merged Outputs** action to move merged output folders to Trash while keeping source clips.
- Merge and cleanup progress screens with per-event status.
- Actions section on the main screen to choose between merging or removing merged outputs.
- Per-event and bulk selection when removing merged outputs.
- Gap detection warns when consecutive clips are more than 2 minutes apart.
- Parallel camera merges within each event for faster processing.
- Output validation ensures merged files exist and are non-empty.
- Safe cleanup moves merged output folders to Trash (not permanent delete) with confirmation dialog.
- Live per-event status indicators: ready, already merged, partially merged, merging, merged, skipped, partial failure, failed.
- Scan-time detection of existing merged outputs with per-camera merge review before overwriting.
- Detail panel shows camera breakdown with segment counts, gap status, and existing output status per event.
- Finder selection support with optional default source folder preference.
- Configurable output root, overwrite control, and ffmpeg path.
- Metadata-aware merge output with source timestamp carry-over.

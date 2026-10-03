# Video Converter Changelog

## [GIF Conversion and Size Estimates] - {PR_MERGE_DATE}

- Add GIF output via gifski with 50% default quality and automatic source FPS.
- Show format-specific settings and estimated total output size in both conversion commands.
- Estimate GIF size by encoding samples; cancel outdated estimates when settings change.
- Fix the initialization status remaining visible during conversion.
- Reveal converted output files and reset the queue for subsequent conversions.

## [Remove Audio] - {PR_MERGE_DATE}

- Add Remove Audio to override replacement audio and hide audio bitrate settings.
- Allocate the full target bitrate to video when removing audio in file size mode.

## [Windows Support] - {PR_MERGE_DATE}

- Add Windows support with FFmpeg/ffprobe discovery and installation instructions.
- Select Windows GPU encoders only after checking driver availability, with software fallback.
- Use explicit encoding libraries and compatible preset options.
- Handle missing tools without an unhandled initialization error.

## [Initial Version] - 2025-05-15

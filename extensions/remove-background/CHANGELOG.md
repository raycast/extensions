# Remove Background

## [Move to Leonardo.Ai] - 2026-11-25

- The remove.bg API moves to Leonardo.Ai on December 1, 2026, so background removal now uses Leonardo's sync API
- Requires a new Leonardo.Ai API key (remove.bg keys don't carry over). Leonardo.Ai bills API usage per image, see the README
- Output resolution options now match what Leonardo supports: Preview, Full and Auto. The default is Preview, which returns a small image, so pick Full or Auto for more detail
- Results are saved as PNG (`removed-<name>.png`) without overwriting existing files, including files created while processing. Leonardo.Ai recommends images under about 7.5 MB for direct input, so larger files may need a smaller copy
- The Crop checkbox is now passed through to the API
- Requests time out with a readable error instead of leaving the form loading, and common errors (wrong API key, rate limit, image too large) now say what to do. Submitting twice no longer sends a second billed request

## File Picker (2022-03-21)

- Files can be selected using the Finder file picker;

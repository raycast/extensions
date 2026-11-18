# Remove Background

## [Move to Leonardo.Ai] - {PR_MERGE_DATE}

- The remove.bg API moves to Leonardo.Ai on December 1, 2026, so background removal now uses Leonardo's sync API
- Requires a new Leonardo.Ai API key (remove.bg keys don't carry over)
- Output resolution options now match what Leonardo supports: Preview, Full and Auto
- The Crop checkbox is now passed through to the API
- Results are saved with a `.png` extension, since the API always returns PNG
- Requests time out with a readable error instead of leaving the form loading
- Dropped the `remove.bg` npm package (and its deprecated `request` dependency)

## File Picker (2022-03-21)

- Files can be selected using the Finder file picker;

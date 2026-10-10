# Media Switcher Changelog

## [Detail view and enhancements] - {PR_MERGE_DATE}

✨ New

- Detail panel with session artwork (album covers, video thumbnails), auto-sized by aspect ratio with compact headings for long titles
- `Group playing sessions at the top` preference (Playing section)
- Pin/Unpin for apps, kept in a Pinned section above everything
- List search now covers app name and artist, not just title

💎 Improvements

- Refreshes are faster: shortcut scanning and Store icon resolution moved out of the hot path and cached
- Play/pause/switch confirmations resolve in under a second instead of up to 2.5s

🐞 Fixes

- Rapid Previous/Next no longer errors when the track changes mid-press

## [Initial Release] - 2026-09-11

Initial version
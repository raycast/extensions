# Claude Usage Forecast Changelog

## [Initial Release] - {PR_MERGE_DATE}

- Initial release of the Claude Usage Forecast extension.
- Menu-bar command samples weekly Claude Code rate-limit utilization in the background and turns green/orange/red by threshold.
- Detail view renders an SVG chart of the current weekly window (actual + forecast + limit + predicted crossing), with the live figures alongside it in the sidebar.
- Separate methodology command explains how the forecast is built: the per-day breakdown of the window, the learned weekday and hour profiles, the calibration factor, and what the numbers cannot see.
- Forecast is calibrated against the live `api.anthropic.com` usage endpoint and shaped by local `~/.claude/projects/**/*.jsonl` transcripts, so the displayed percentage always matches what Claude Code reports.
- Transcript cache is keyed by (size, mtime). Cross-file duplicate usage IDs (resumed/forked sessions) are subtracted per-id from a fresh copy of each file's hour buckets, so the cached snapshot never drifts across menu-bar refreshes.
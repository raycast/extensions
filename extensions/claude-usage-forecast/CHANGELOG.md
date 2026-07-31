# Claude Usage Forecast Changelog

## [Initial Release] - 2026-07-31

- Initial release of the Claude Usage Forecast extension.
- Menu-bar command samples weekly Claude Code rate-limit utilization in the background and turns green/orange/red by threshold.
- Detail view renders an SVG chart of the current weekly window (actual + forecast + limit + predicted crossing), a per-day table, and the learned weekday/hour usage pattern.
- Forecast is calibrated against the live `api.anthropic.com` usage endpoint and shaped by local `~/.claude/projects/**/*.jsonl` transcripts, so the displayed percentage always matches what Claude Code reports.
# Changelog

## [Initial Release] - 2026-02-18

### Added

- Browse Claude Code conversation history with detail preview
- Browse Claude Code plans (`.md` files from `~/.claude/plans`)
- Project filter dropdown for history
- Sort toggle: last active vs created
- Copy first/last prompt, resume commands, session ID
- Search debounce (150ms) on both history and plans
- Safe file reading with 2MB cap to prevent heap OOM on large sessions

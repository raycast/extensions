# Claude Resume Changelog

## [Initial Version] - {PR_MERGE_DATE}

- Browse every Claude Code session by reading `~/.claude/projects/*/*.jsonl` directly
- Each list item shows the actual first user prompt as title — sprechender than UUIDs
- Search across title, working directory, and session ID
- Detail view shows the full first user message + metadata (UUID, CWD, timestamp, log path)
- Resume action runs `claude --resume <uuid>` in iTerm2 or Terminal.app via AppleScript
- Copy actions for resume command, session identifier, working directory, log file path
- Show log file in Finder; open in default editor
- mtime-based cache for warm-reload performance (< 100ms with 1000+ sessions)
- Preferences: terminal app, session limit (10–500), JSONL root path

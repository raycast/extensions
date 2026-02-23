# ClaudeCast Changelog

## [1.2.0] - 2026-02-20

### Added

- **Deep Search Sessions**: New command that searches through full session content across all Claude Code conversations
  - Streams through JSONL files incrementally, showing results as they're found
  - Debounced search with AbortSignal cancellation when query changes
  - Searches all message content (user and assistant) case-insensitively

### Fixed

- **Project Path Resolution**: Fixed "Project path no longer exists" error when browsing sessions
  - Claude Code encodes both `/` and `.` as `-` in directory names, making the previous naive decode incorrect for usernames with dots or project names with dashes
  - Added three-tier resolution: sessions-index.json (authoritative), filesystem-guided walk, naive decode (fallback)
  - Fixed `encodeProjectPath` to correctly encode both `/` and `.`

## [1.1.0] - 2026-01-27

### Added

- **Ralph Loop**: Autonomous agentic loop that breaks down complex tasks and executes them with fresh context per iteration
  - Two-phase approach: Planning phase creates atomic task breakdown, execution phase runs each task in a fresh Claude session
  - Full TUI visibility during Claude sessions (no garbled output)
  - Signal-based termination using marker files
  - Resume functionality via `.ralph/resume.sh` script when max iterations reached
  - Graceful stop support via `touch .ralph/stop`
- **Anthropic API Key Support**: Added alternative authentication method for pay-as-you-go users
  - Set `ANTHROPIC_API_KEY` in preferences alongside existing OAuth token option
- **Claude Installation Check**: All commands now verify Claude CLI is installed and show helpful install instructions if missing

### Fixed

- **Memory Leak in Menu Bar Monitor**: Fixed JS heap out of memory crashes
  - Proper stream cleanup in session parser (readline interfaces now disposed correctly)
  - Added 30-second in-memory caching for today's stats to prevent repeated file parsing
  - Query optimization with `limit` and `afterDate` options to skip unnecessary files
  - Lightweight project discovery that counts files instead of parsing all sessions
- **Duplicate React Keys in Browse Sessions**: Fixed console errors from duplicate session IDs across projects
  - Added deduplication logic that keeps the most recently modified session
- **Ask Claude Code Context Capture**: Fixed stale VS Code cache being read
  - Changed to manual context capture (⌘G) instead of auto-capture on load
  - Project path now persists across sessions via LocalStorage
- **Path Validation**: Added existence checks before launching projects to prevent errors on deleted directories

### Changed

- **Ralph Loop UI**: Renamed from "Ralph Loop (Fresh Context)" to "Ralph Loop" with cleaner description
- **Task Input Fields**: Ralph Loop task and requirements fields now use multiline TextArea for easier editing
- **Loading States**: Added animated toast "Preparing Ralph Loop..." while script generates

## [Initial Release] - 2026-01-23

### Added

- **Ask Claude Code**: Quick prompts with VS Code context capture
- **Project Launcher**: Browse and launch projects with favorites
- **Session Browser**: Find and resume Claude Code conversations
- **Quick Continue**: One-keystroke session continuation
- **Git Actions**: Review staged changes, write commit messages
- **Prompt Library**: 17 curated agentic workflow prompts with support for repository path input
- **Transform Selection**: Code transformations from any app
- **Menu Bar Monitor**: Real-time Claude Code status and quick access
- **Usage Dashboard**: Cost and usage metrics tracking


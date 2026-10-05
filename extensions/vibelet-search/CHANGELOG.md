# Changelog

All notable changes to this project will be documented in this file.

## [Update] - 2026-08-20

### Enhancements

- Cross-list all sessions in a single timeline (no agent grouping), with a per-row source label
- `⌘K` filter dropdown: All / Agent (Claude, Codex) / Source / Project
- Content-search hits jump straight to the matched message, highlighted in the detail view
- Incremental metadata cache (`mtime + size` fingerprints) — re-opening is instant after the first scan, and only changed session files are re-read
- Merged content index — full-text search runs ripgrep over one index file instead of every session file, returning exact message-level hits
- Content search debounced (150 ms) so fast typing doesn't spawn a ripgrep per keystroke
- Data layer split into `adapters/`, `scanners/`, `index/`, and `load-messages.ts` for easier agent support

### Fixes

- Fixed a premature-close error in streamed JSONL head reading that could wipe session titles

## [Initial Release] - 2026-06-25

- Unified search across Claude Code (`~/.claude`) and Codex CLI (`~/.codex`) sessions
- Claude Desktop app source — surfaces sessions from `~/Library/Application Support/Claude/claude-code-sessions/`, with PR metadata, deduped against the CLI source
- Codex Desktop app source — distinguished from Codex CLI via the `session_meta.originator` field
- List grouped into four sections: Claude Code, Claude App, Codex CLI, Codex App, each with its own colored badge
- Full-text search powered by ripgrep, with matched context view
- Resume sessions in Terminal.app, iTerm, Ghostty, WezTerm, or Warp
- Per-session "Open in App" action (Claude.app / Codex.app, `⌘O`); App-sourced sessions default to opening the app, CLI-sourced default to resuming in the terminal
- Session detail view shows linked PR # for Claude App sessions when present
- Chat-style detail view with timestamps and source badges
- Configurable Claude / Codex CLI binary paths

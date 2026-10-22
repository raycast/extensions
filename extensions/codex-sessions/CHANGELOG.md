# Codex Sessions Changelog

## [Project Browser and Display Titles] - 2026-09-22

- Add Browse Codex Sessions to navigate project folders and their threads, with project-scoped search and session counts.
- Start a new thread in the selected project with ⌘N, or choose a folder outside session history.
- Rename Open Codex Project to Browse Codex Sessions while preserving existing hotkeys and aliases. Project folders use recent session activity instead of frecency; reopen-by-git-remote is no longer available.
- Preserve Search Codex Sessions for searching across all projects.
- Display and search Codex's saved thread names, keep original titles searchable, and support older databases.

## [Initial Version] - 2026-09-07

- **Search Codex Sessions**: fuzzy-find local Codex threads with Interactive / Working / Unread Completed / All / Archived scopes, grouped by time buckets, with a bounded rollout-file fallback when the state database is unavailable
- **Open Codex Project**: project folders derived from your session history, frecency-ranked, with missing-folder detection and reopen-by-git-remote
- Optional live **Working / Done · Unread** status tags, powered by the [`codex-raycast`](https://www.npmjs.com/package/codex-raycast) hook (`npx codex-raycast setup`)
- Resume sessions in Terminal or iTerm, copy resume commands, and open threads via `codex://` deep links

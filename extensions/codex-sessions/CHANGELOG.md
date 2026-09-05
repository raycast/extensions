# Codex Sessions Changelog

## [Initial Version] - {PR_MERGE_DATE}

- **Search Codex Sessions**: fuzzy-find local Codex threads with Interactive / Working / Unread Completed / All / Archived scopes, grouped by time buckets, with a bounded rollout-file fallback when the state database is unavailable
- **Open Codex Project**: project folders derived from your session history, frecency-ranked, with missing-folder detection and reopen-by-git-remote
- Optional live **Working / Done · Unread** status tags, powered by the [`codex-raycast`](https://www.npmjs.com/package/codex-raycast) hook (`npx codex-raycast setup`)
- Resume sessions in Terminal or iTerm, copy resume commands, and open threads via `codex://` deep links

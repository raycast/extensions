# Claude Artifacts Changelog

## [Initial Version] - {PR_MERGE_DATE}

- Search your Claude Code artifacts by title or project, sorted most-recent-first
- Open an artifact in the browser, copy its link or title, or reveal the project folder it was published from
- Filter by project once more than one project has recorded artifacts
- Reads a local index at `~/.claude/artifacts.json` — no network calls, no API key
- Ships the `PostToolUse` hook that records artifacts as you publish them, plus a diagnostic probe for verifying the hook yourself

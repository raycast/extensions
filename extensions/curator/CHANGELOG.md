# Curator Changelog

## [Initial Release] - {PR_MERGE_DATE}

- **Search Skills** — searchable inventory of installed Claude Code & Codex skills, grouped by source, with a `SKILL.md` preview and copy-name / copy-`/command` / copy-trigger / open-in-editor actions.
- **Skill Doctor** — health checks (broken symlinks, missing/unparseable `SKILL.md`, name ≠ directory, Claude↔Codex drift, stale plugin cache), each with a copy-to-clipboard fix command. Never writes to the filesystem.
- **Recommend Skills** — describe a task in natural language and an AI ranks the most relevant installed skills with reasons. Uses Raycast AI by default, or any OpenAI-compatible provider via your own key.

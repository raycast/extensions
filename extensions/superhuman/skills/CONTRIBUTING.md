# Contributing to Superhuman Skills

## Skill format

Each skill lives in `skills/<name>/SKILL.md`. The file MUST start with YAML frontmatter:

```yaml
---
name: <kebab-case-id>            # matches the directory name
description: <one-line summary>  # appears in Raycast and in command descriptions
tools_used:                      # MCP tool names (snake_case, official)
  - query_email_and_calendar
  - create_or_update_draft
read_only: true                  # false if the skill writes to the account
upstream: <raw URL on github.com/superhuman/mcp-mail>
upstream_sha: <commit sha from last sync>  # set by `npm run sync-skills`
---
```

After the frontmatter, the body is the skill prompt as Markdown. Keep it tight — these prompts are read by humans AND by the AI.

## Authoring guidelines

- **Tool-agnostic where reasonable.** Refer to capabilities ("draft a reply", "find availability") rather than exact tool names, so the same prompt works against the official MCP or the Raycast extension.
- **When you must name a tool, use the official MCP name** (e.g. `query_email_and_calendar`, not `search-inbox`). This keeps content droppable into the upstream repo without edits.
- **Declare every tool in `tools_used`.** The read-only gate and capability checks rely on it. Drift between `tools_used` and the body is a CI failure.
- **Mark `read_only` honestly.** Anything that drafts, sends, archives, labels, trashes, marks-spam, or modifies calendar / personalization is `read_only: false`. When in doubt, set false.
- **Keep skills focused.** One skill = one workflow. Long branching prompts belong in two separate skills.

## Read-only mode

Skills with `read_only: false` are blocked when the extension's "Read-only mode" preference is enabled. The skill's underlying write tools also throw at the boundary, so even a skill that ignores its own frontmatter cannot bypass the gate.

## Upstream parity

The authoritative source for these skills is **https://github.com/superhuman/mcp-mail/tree/main/skills**.

- `scripts/sync-skills.ts` fetches each known `SKILL.md` from upstream, compares against the local copy, and updates `upstream_sha` in frontmatter when content matches. If content drifts, it prints the diff and exits non-zero so CI can flag the divergence.
- A weekly GitHub Action template is checked in at `scripts/sync-skills.workflow.yml`. The raycast/extensions monorepo intentionally excludes per-extension `.github/` directories, so to wire the cron job the workflow must be copied to the monorepo's root `.github/workflows/`. The PR description tracks this as a follow-up for maintainers.
- Local diff for a single file: `npm run sync-skills`. Inspect output, decide whether to accept upstream or keep our adapted version, then commit.

## Adding a new skill

1. Pick a kebab-case name. Create `skills/<name>/SKILL.md`.
2. Fill in frontmatter (set `upstream_sha: ""` if not yet synced).
3. Write the body.
4. Add a command entry to `package.json` `commands[]` with name `skill-<name>` and `mode: "view"`.
5. Add the matching `src/skill-<name>.tsx` file (copy an existing skill component as a template).
6. Add the skill to `skills/README.md` table.
7. Add a test in `tests/skills.test.ts` that the new SKILL.md parses and has a matching command.

## Removing a skill

If a skill is removed from upstream, the sync script flags it. Discuss before deleting: the Raycast surface area for the command is user-facing and removing it is a breaking change. Prefer marking deprecated in frontmatter (`deprecated: true`) and updating the README.

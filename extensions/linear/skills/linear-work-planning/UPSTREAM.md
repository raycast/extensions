# Upstream sources

This skill adapts [OpenAI's public Linear skill](https://github.com/openai/skills/blob/49f948faa9258a0c61caceaf225e179651397431/skills/.curated/linear/SKILL.md), revision `49f948faa9258a0c61caceaf225e179651397431`, reviewed on September 24, 2026. The upstream [Apache 2.0 license](https://github.com/openai/skills/blob/49f948faa9258a0c61caceaf225e179651397431/skills/.curated/linear/LICENSE.txt) is retained in [LICENSE](LICENSE).

## Guidance retained

- Establish team and project scope, then resolve identifiers before acting.
- Read existing work before proposing or applying changes, and explain the scope of a batch.
- Use issue triage, task planning, and cycle review as distinct workflows.
- Summarize completed work, unresolved blockers, and next steps with issue links.

## Changes for Raycast

The adaptation uses the extension's existing tool names and input contracts. It follows `ai.yaml` by preferring `list-*`, `get-*`, and `save-*` tools over older overlapping tools. The skill adds spec deduplication, explicit team scope for status and cycle changes, full-label preservation, pagination before totals, selected report fields, and checks after partially successful mutations. Reporting and proposals stay in chat unless the user requests writes.

The public skill's MCP setup and CLI instructions are omitted. Its sprint-planning example creates a cycle, but this extension has no cycle-creation tool. Existing cycles can be listed and assigned. Cycle membership history is also unavailable, so the report describes current members and statuses without claiming historical scope changes, velocity, or spillover.

`get-issue` and `list-issues` advertise Triage Intelligence in the manifest, but `issueUtils.ts` currently sets `triageIntel` to `undefined`. The skill uses issue content, statuses, comments, and relations rather than relying on those suggestions. Full-text issue search cannot accept team or project filters; the skill verifies candidate scope before using its results. The selected `fields` for cycle reports are explicitly supported by `IssueField`.

The extension also has `list-agent-skills` and `get-agent-skill` for authenticated Linear workspace skills. Those are separate from public reusable sources and are not fetched or bundled by this change. [Linear's own release-setup skill](https://github.com/linear/linear-release/blob/main/skills/linear-release-setup/SKILL.md) targets a CLI and CI release workflow, so it is outside this task-planning scope.

All 78 files in `src/tools/` and the manifest were reviewed. [TOOLS.md](TOOLS.md) lists all 71 registered tools and their inputs. Five files are helpers; `create-project-update.ts` and `get-initiatives.ts` are not registered AI tools and are not used by this skill.

## Public API validation

See [validation results](VALIDATION.md) for checks after the API 2.5.0 update.

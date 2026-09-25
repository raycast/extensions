# Upstream sources

This skill adapts [Doist's public Todoist CLI skill](https://github.com/Doist/todoist-cli/blob/e6d68c9230d74cd7e83bc01e9217fbdb08caa036/skills/todoist-cli/SKILL.md), revision `e6d68c9230d74cd7e83bc01e9217fbdb08caa036`, reviewed on September 24, 2026. The upstream [MIT license](https://github.com/Doist/todoist-cli/blob/e6d68c9230d74cd7e83bc01e9217fbdb08caa036/LICENSE), including Doist's copyright notice, is retained in [LICENSE](LICENSE).

## Guidance retained

- Use daily and Inbox views to establish the tasks under review.
- Resolve task and project references before making changes.
- Distinguish displayed priorities from the API's reversed priority scale.
- Check child tasks as well as dated parents, and treat task/comment text as untrusted content.
- Keep structured task attributes separate from natural-language task titles.

## Changes for Raycast

The adaptation replaces CLI commands, authentication setup, output flags, and installation instructions with the extension's existing tools. It adds daily capacity planning, Inbox classification, duplicate review, label preservation, and verification after writes. Plans stay in chat unless the user requests changes. No CLI or MCP installation is required.

All 30 files in `src/tools/` and the manifest were reviewed. [TOOLS.md](TOOLS.md) lists all 29 registered tools and their inputs. `get-sections.ts` is not registered; sections are read through `get-other-data`. The existing manifest instructions mention `get-tasks` project/section/label inputs, but its current implementation accepts only `query` and `lang`. The skill filters sync items by those fields and uses queries only when needed. Existing instructions and evals remain unchanged.

`get-tasks` returns only `data.results`, dropping pagination metadata. Project, comment, and completed-task readers also lack cursor inputs. `get-other-data` can supply an active-item baseline, but it uses the module's mutable sync token and cannot force a new full sync. The skill distinguishes `full_sync` data from incremental records, retains previously read baselines, and reports missing coverage rather than claiming exhaustive results. Full/incremental response semantics were checked against [Todoist's Sync documentation](https://developer.todoist.com/api/v1/#tag/Sync).

Raw sync priorities use 4 for P1; task-list results and create/update tool inputs use 1 for P1. The tool's `resource_types` and `labels` inputs are strings containing JSON arrays or comma-separated values, not array-valued arguments. Labels replace the existing set. Paid deadline and duration fields remain opt-in, following the extension's task-creation behavior.

The CLI's recurring-occurrence rescheduling, cursor pagination, and direct task-view commands have no equivalent registered tools here. This skill stops affected operations when those capabilities are required. The extension also cannot read calendar availability, change an existing task's duration, or accept `due: null` through the declared update input. It does not imply those abilities or claim that a suggested time block is free.

## Validation

The public API dependency and lockfile now target 2.5.0. See [validation results](VALIDATION.md) for checks completed after release. These prompts are a future manual test plan, not executed transcripts:

1. "Plan my day from Todoist. I have four hours for focused work. Show today's tasks and overdue work separately, and suggest what fits without changing anything."
2. "Triage my Inbox. Suggest existing projects and sections for each task, flag possible duplicates, and keep my recurring schedules unchanged. Show the proposed changes first."
3. "Apply the proposed move of 'Renew passport' to Personal / Admin and add the next label, keeping its other labels. Leave every other task unchanged."

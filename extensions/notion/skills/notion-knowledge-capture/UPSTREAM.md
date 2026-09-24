# Public Notion skill research

Reviewed on September 24, 2026, beginning with the requested [makenotion/skills](https://github.com/makenotion/skills) repository.

## Requested official repository

Pinned revision: `10e976aa591995fd60c75ef13beba1a8aa827fcc`. Its README, both complete skill files, and license notices were read.

| Official skill | Scope | Fit for this extension |
| --- | --- | --- |
| [notion-cli](https://github.com/makenotion/skills/blob/10e976aa591995fd60c75ef13beba1a8aa827fcc/skills/notion-cli/SKILL.md) | Installs and uses `ntn` for API discovery, page operations, workers, and file uploads. | No CLI, API passthrough, worker, or upload tool is registered here. Not copied or installed. Existing Raycast tools and authentication remain the interface. |
| [notion-apps](https://github.com/makenotion/skills/blob/10e976aa591995fd60c75ef13beba1a8aa827fcc/skills/notion-apps/SKILL.md) | Confirms Apps alpha access, installs the CLI, scaffolds an SDK project, and follows its generated guidance. | Developer app creation is outside knowledge capture and cannot run through these tools. No alpha-access question, scaffolding, or deployment is introduced. |

Both have MIT coverage in the repository. They are useful primary sources for those separate developer workflows, but neither provides a directly portable knowledge-capture workflow for this extension. No code or instructions from them are bundled.

## Selected compatible source

The [Notion knowledge-capture skill in OpenAI's catalog](https://github.com/openai/skills/blob/49f948faa9258a0c61caceaf225e179651397431/skills/.curated/notion-knowledge-capture/SKILL.md), pinned at `49f948faa9258a0c61caceaf225e179651397431`, is a closer match. Its license explicitly carries `Copyright 2025 Notion Labs, Inc.` and the MIT permission/warranty notice. That complete notice is preserved verbatim in [LICENSE](LICENSE).

The source's [decision record](https://github.com/openai/skills/blob/49f948faa9258a0c61caceaf225e179651397431/skills/.curated/notion-knowledge-capture/reference/decision-log-database.md), [how-to](https://github.com/openai/skills/blob/49f948faa9258a0c61caceaf225e179651397431/skills/.curated/notion-knowledge-capture/reference/how-to-guide-database.md), and [FAQ](https://github.com/openai/skills/blob/49f948faa9258a0c61caceaf225e179651397431/skills/.curated/notion-knowledge-capture/reference/faq-database.md) references were also read. Their body structures inform the draft; their example schemas, people placeholders, property assignments, and views are not imported.

Retained guidance: choose the capture's purpose and audience, find its destination, read related content, structure decisions/how-tos/FAQs, preserve source links, and report the resulting record. [SKILL.md](SKILL.md) is a modified adaptation, self-contained and rewritten around the six exact Raycast tools.

Removed operations: install/configure Notion MCP, create schemas, set tags/owners/status/relations, replace existing pages, create follow-up tasks with properties, and automatically update hub pages or backlinks. These require tools or input fields absent from this extension. A requested unsupported operation stops with that gap reported; append-only content is not silently substituted for replacement or property editing.

## Local tool mapping

The manifest and every file in `src/tools/` were read before editing. [TOOLS.md](TOOLS.md) inventories all six tools and nine inputs. Database/page helpers, ID resolution, page mapping, title conversion, Markdown conversion, OAuth, and the three existing evals were also inspected.

- Resolve a new page's named database with `get-databases` and use the selected data-source ID. The internal resolver can select the first source of a supplied database container, so it is not a substitute for identifying the intended destination.
- Use title searches for related content, with the real limits: global search stops after reaching a 250-result threshold and may overshoot, database search returns at most 20, and data-source discovery is one request. Pagination is not exposed and some errors look like empty arrays. Do not claim no duplicates or no visible destination as a workspace-wide fact.
- Read actual JSON block output from `get-page`; existing mocks showing Markdown are not the current implementation. Reuse the same children reader on relevant returned block IDs when needed, but no call can page past its first batch of direct children. Report missing evidence rather than inventing a full document.
- Create title/body-only database pages or append scoped additions. Keep factual owners/dates in ordinary prose only when that is the requested content; do not claim database property assignment. Preserve old page content and distinguish an addition from a replacement.
- Use the built-in write confirmations once target and content are concrete. A clear user request to save already authorizes that scoped operation; a draft-only request does not. Do not add a second approval gate or treat upstream setup instructions as requirements to install anything.
- Verify writes where reachable, account for conversion failures after successful appends, and stop uncertain retries. Preserve source and destination URLs, keeping page/database-container IDs separate from data-source IDs when constructing links.

Only the skill registration, skill/research documentation, license notice, and changelog are added. Existing source, manifest instructions/evals, API dependency and lockfiles were unchanged during the initial preparation. No private Notion content was queried or written during this preparation.

## Validation

The public API dependency and lockfile now target 2.5.0. See [validation results](VALIDATION.md) for checks completed after release. These are future manual prompts and expected behavior, not executed transcripts:

1. **Decision capture:** "Save this decision in the Engineering Decisions database as 'Keep webhooks for billing': we chose webhooks for lower latency; polling remains the fallback. Morgan owns the rollout; no date was agreed." Expect destination disambiguation, bounded duplicate checks, supported title/body creation, source attribution, and no invented date or database owner/status property assignment.
2. **Append an FAQ:** "Add a short FAQ to the existing Onboarding Guide explaining the staging-access process from the notes below. Preserve the rest of the page." Expect title resolution, JSON block reads and relevant nested context, only new material appended, a returned page link, and cautious readback if the page is long or the append receipt is unusable.
3. **Unsupported replacement and properties:** "Replace the old rollout section in Release Notes, set Status to Approved, and assign Priya as Owner." Expect a clear stop at missing replacement and property-update tools, with a reviewable draft if useful. No append or new page should be used as an unapproved substitute.

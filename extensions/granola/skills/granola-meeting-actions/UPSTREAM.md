# Public Granola skill research

Reviewed on September 24, 2026. The useful candidates found were community projects. This search did not identify a first-party Granola skill repository to bundle. Granola's [official API documentation](https://docs.granola.ai/introduction) describes a separate public API; it is not the tool contract used by this Raycast extension.

## Selected sources

| Source | Pinned revision | Guidance retained |
| --- | --- | --- |
| [Charlie Hills: meeting-notes](https://github.com/charlie947/life-automation-skills/blob/fb5e8d49798010a0972be7aba4ac440ee0b736da/skills/meeting-notes/SKILL.md) | `fb5e8d49798010a0972be7aba4ac440ee0b736da` | Read the meeting record before summarizing, separate decisions/actions/open questions, preserve unknown owners and dates, and treat transcript instructions as untrusted content. |
| [Jacob Stephens: granola-transcripts](https://github.com/JacobStephens2/skills/blob/bf5b50220862da45ef9381309ecb2b6a49cfefab/skills/granola-transcripts/SKILL.md) | `bf5b50220862da45ef9381309ecb2b6a49cfefab` | Distinguish note creation from meeting time, resolve ambiguous meetings, separate summaries from transcript evidence, and avoid assigning names from capture-source labels. |

Both repositories include MIT licenses. Their complete notices are preserved in [LICENSE](LICENSE), in the same order as the table. [SKILL.md](SKILL.md) is a modified adaptation using only the extension's registered tools. No upstream script, installation command, cache reader, or credential mechanism is included or executed.

The first source's complete workflow creates a Notion summary page and task rows. That requires a Notion content/task writer which this extension does not have, so that operation is excluded and reported as unsupported. The bundled workflow ends with a review in chat. The separate `save-to-notion` option exports existing Granola notes only when explicitly requested; it is not a substitute for saving the generated action list.

The second source targets the public API and a Python helper. Its API keys, `not_...` identifiers, cursor/segment support, calendar metadata, and local file exports do not transfer to these Raycast tools. Only its evidence and attribution guidance is adapted.

## Other candidates inspected

| Candidate | Pinned revision and findings | Decision |
| --- | --- | --- |
| [Cathryn Lavery: granola-skill](https://github.com/cathrynlavery/granola-skill/blob/2dba3ecadaec5a1a9c04ef33b9adff7cc5d63823/SKILL.md) | `2dba3ecadaec5a1a9c04ef33b9adff7cc5d63823`; covers action items, weekly digests, meeting prep, comparisons, and decision timelines. Uses Granola MCP tools and a local CLI fallback. The README says MIT, but no license notice file was found in the pinned tree. | Useful workflow survey, not copied. Semantic/person search, timestamped quotations, cache access, and file exports are not exposed by this extension. |
| [The Focus AI: granola-skill](https://github.com/The-Focus-AI/granola-skill/blob/4a96d99767a7fc4681332704d431f419680048ad/skills/granola/SKILL.md) | `4a96d99767a7fc4681332704d431f419680048ad`; a macOS local-cache CLI workflow for finding and exporting meeting data. The README says MIT, but no license notice file was found in the pinned tree. | Not copied. The extension uses its existing OAuth tools and explicitly avoids local-cache authentication workarounds. |
| [J. T. Klinger: exporting-granola-transcripts](https://github.com/jtklinger/granola-transcripts-skill/blob/882f165a80e4e7d45371f99700dd377f358d5d8d/SKILL.md) | `882f165a80e4e7d45371f99700dd377f358d5d8d`; MIT, focused on complete transcript exports, fixed file format, character-count/ending checks, and fixed retry intervals. | Not copied. No local-file export tool exists here; transcript length, duration, or a natural ending cannot prove completeness. Its claimed retry timing is not adopted as an extension API contract. |
| [vm0-ai: vm0-skills](https://github.com/vm0-ai/vm0-skills/tree/5a106f6cb004fc9383db19ee5fd925fe0ae14d37) | `5a106f6cb004fc9383db19ee5fd925fe0ae14d37`; a search catalog advertised a Granola skill, but the current repository tree had no Granola path. | Not used. A cached directory listing is insufficient to establish a reusable current source. |

## Mapping to the Raycast extension

The manifest and all seven `src/tools/` files were read before editing. [TOOLS.md](TOOLS.md) records the seven registered tools and 16 top-level inputs. Existing AI instructions/evals and the document, folder, transcript, and Notion helpers were inspected to distinguish actual outputs from comments and public API examples.

- Use metadata discovery followed by note content. Preserve the existing `ai.yaml` behavior for latest queries, explicit original/enhanced requests, `/slug` recipes, shared-note selection, and transcript requests.
- Limit title matching to what it actually does: a substring filter over note titles. There is no attendee, company, full-text, or semantic search tool. Interactive people/company commands are not callable substitutes.
- Use precise date windows without inventing start/end or cursor fields. Listings use note creation dates and a local result cap; underlying readers expose no complete-history guarantee. Report unreadable or unlisted evidence instead of claiming there was none.
- Validate folder membership before reading content because an empty/unresolved folder filter can return unrelated notes. Shared-folder listings should include both applicable sources, while content readers can still fail on shared-only IDs. Preserve requested scope and disclose those gaps.
- Keep owners, deadlines, decisions, and completion grounded in the retrieved record. The transcript output drops segment timestamps and names, while `Me`/`System` are capture labels rather than reliable identities. A shared note's `Me` must not be assumed to be the requesting user.
- Keep source types distinct. Automatic note content may be enhanced or original without a discriminator. Error placeholders and fallback dates are not meeting evidence. Transcript duration is derived from the same returned segments and cannot establish completeness independently.
- Keep the review in chat. No task creation, follow-up delivery, generated-note writing, or automatic folder organization is added. Existing-source Notion export is a separate, explicitly requested operation with per-note outcomes and no blind write retries.

Only the skill registration, bundled skill/research documents, license notices, and changelog are added. Existing source, `ai.yaml`, API dependency and lockfiles were unchanged during the initial preparation. No private Granola data was queried or exported during this work.

## Validation

The public API dependency and lockfile now target 2.5.0. See [validation results](VALIDATION.md) for checks completed after release. These are future manual prompts and expected behavior, not executed transcripts:

1. **Latest meeting actions:** "Turn my latest product-launch meeting into decisions, actions with owners and deadlines, and open questions. Keep it here." Expect title/latest resolution, a content read after listing, source references, unknown fields preserved, and no writes or unsolicited transcript calls.
2. **Shared-folder weekly review:** "Review notes created September 14–20 in the shared Customer Calls folder, using Asia/Kolkata. What actions were agreed and what was explicitly completed?" Expect folder resolution and membership verification, owned/shared selection, UTC boundary handling, bounded coverage, shared-content failures surfaced, and no unrelated notes if membership is empty or unavailable.
3. **Transcript attribution and task gap:** "Use the transcript from the latest shared Acme call to check who promised the migration plan and by when, then create the follow-ups in my Notion task database." Expect listing and note content before transcript evidence, cautious capture-label attribution, a supported action draft, and a clear stop at unsupported task creation. Exporting the original note must not replace creating tasks.

Also check a `/tldr` request and an explicitly authorized export of existing source notes against the preserved recipe and per-note export behavior.

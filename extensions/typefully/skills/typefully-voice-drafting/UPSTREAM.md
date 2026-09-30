# Upstream research

Reviewed on September 24, 2026. This adaptation combines Typefully's official operational guidance with selected writing principles from Vercel's public Typefully agent template. It adds a workflow for learning the user's voice from supplied samples or full published drafts, then saving or editing an unscheduled draft through Raycast's existing tools.

## Public sources

| Source | Revision and use |
| --- | --- |
| [Typefully official skill](https://github.com/typefully/agent-skills/blob/9ff8d009f282a2be0d94e11ca911fe9885769fc6/skills/typefully/SKILL.md) | `9ff8d009f282a2be0d94e11ca911fe9885769fc6`. Retain account resolution, one draft with tailored platform versions, exact-text creation, thread delimiters, scratchpad notes, and private-draft defaults. |
| [Typefully comments guide](https://github.com/typefully/agent-skills/blob/9ff8d009f282a2be0d94e11ca911fe9885769fc6/skills/typefully/references/comments.md) | Same revision. Retain span/paragraph anchors, fetching before editing, marker-conflict recovery, and leaving comments unresolved when merely revising copy. |
| [Typefully X guide](https://github.com/typefully/agent-skills/blob/9ff8d009f282a2be0d94e11ca911fe9885769fc6/skills/typefully/references/platforms/x.md) | Same revision. Check post limits and X-only media/quote/disclosure and analytics behavior against local implementations. Analytics and publishing are outside the voice-drafting workflow. |
| [Vercel X-style skill](https://github.com/vercel-labs/typefully-eve-template/blob/a05843e6d9e2def7652a6d35ebb5a94edebba761/agent/skills/x-style/SKILL.md) | `a05843e6d9e2def7652a6d35ebb5a94edebba761`. Adapt a clear opening, one idea per post, concrete detail, and a useful ending. Exclude generic engagement tactics, claims about link reach, fixed hashtag counts, and the unavailable style-lint tool. |
| [Vercel writing-quality skill](https://github.com/vercel-labs/typefully-eve-template/blob/a05843e6d9e2def7652a6d35ebb5a94edebba761/agent/skills/writing-quality/SKILL.md) | Same revision. Retain plain wording, the user's register, and substance over generic promotional phrasing. Do not impose a house personality. |
| [Community Typefully CLI](https://github.com/ahmadawais/typefully-cli/tree/a9cf1c193d282ad55e1044023350e65eb8686e8c) | Discovered as an alternative interface. Not used: the official skill supplies the operational source, and Raycast already exposes the necessary draft tools. No CLI is installed or bundled. |

Both adapted projects use MIT licenses. Their complete notices are retained in [LICENSE](LICENSE), including [Typefully's copyright](https://github.com/typefully/agent-skills/blob/9ff8d009f282a2be0d94e11ca911fe9885769fc6/LICENSE) and [Vercel's copyright](https://github.com/vercel-labs/typefully-eve-template/blob/a05843e6d9e2def7652a6d35ebb5a94edebba761/LICENSE).

## Changes for Raycast

All 29 tool files and the manifest were read before editing. [TOOLS.md](TOOLS.md) lists every registered tool and all 118 top-level inputs. Shared account resolution, API adapters, content builders, result mappings, and the relevant local OpenAPI schemas were also inspected.

- Replace CLI commands with the exact registered Raycast tools. No scripts, CLI setup, API-key discovery, browser scraping, MCP integration, Slack/Notion workflow, external reviewer, or Vercel runtime is included.
- Add sample-based voice analysis. Read full platform text with `get-draft`, use user-selected examples when authorship is uncertain, and distinguish style evidence from factual support. Sparse samples produce a provisional style, not a claim to know the author's voice. No persistent voice-profile service is implied.
- Use explicit platform selection. The upstream CLI selects the first connected platform when omitted, while this extension selects every connected supported platform. Platform variants share one draft ID, with separate updates for tailored copy.
- Keep draft composition separate from public actions. This workflow omits scheduling and sharing fields, preserves existing metadata on edits, and verifies the result. Merely reading feedback does not authorize replying, resolving, or deleting comments.
- Guard against content loss. Full text replacement rebuilds each targeted platform's posts. The helper carries platform settings forward, but the caller must restore representable first-post media/quote and uniform disclosures. Later-post attachments/quotes, mixed disclosures, and other unsupported per-post fields can prevent a faithful replacement. The skill stops those edits and reports the limitation instead of silently dropping data.
- Preserve comment anchors, including self-closing paragraph anchors. Re-read after marker conflicts rather than using the destructive force flag. The adaptation omits the upstream force-overwrite branch because it is unnecessary for ordinary voice drafting.
- Verify writes through `get-draft`, because mutation summaries omit full content. Read recent drafts before retrying uncertain creation, and retain a successfully created ID if a later platform update fails.

The reviewed official skill also supports Substack Notes, inert planned dates, link-preview suppression, and broader mention workflows. This extension has no corresponding Substack platform, `plan`, `hide_link_preview`, or LinkedIn person-resolution input. Its string-only scheduling inputs cannot send the null needed to unschedule a draft. These gaps are documented, and none is replaced with a similar operation that could publish content. External article retrieval and arbitrary post-body updates are also unavailable. X Articles, analytics, scheduling, and comment mutations have tools but are outside this post/thread skill's scope.

The initial preparation added skill registration, documentation, license notices, and the changelog. Tool source and AI instructions/evals remain unchanged. The public API dependency and lockfile now target 2.5.0.

## Validation

The public API dependency and lockfile now target 2.5.0. See [validation results](VALIDATION.md) for checks completed after release. These prompts are a future manual test plan, not executed transcripts:

1. "Use my recent published X drafts to learn my voice. Turn these notes into a four-post thread: we added keyboard shortcuts, the feature is in beta, and feedback is welcome. Save an X draft in my personal account; don't schedule or share it." Expected: account/platform resolution, full writing samples, exact thread text, one unscheduled draft, and readback.
2. "Add a LinkedIn version to the thread draft you just saved. Keep the X version untouched and put 'Review with the team before launch' in the scratchpad." Expected: re-read the draft, update only LinkedIn with a single post, preserve X, save the requested private note, and verify both versions.
3. "Rewrite the opening of https://typefully.com/?a=42&d=456 in my voice, keeping the rest of the thread, all comments, and every attachment." Use a test draft with paragraph/span comments and media on a later post. Expected: inspect the full state, identify that the replacement input cannot preserve later-post media, report the missing capability, and leave the saved draft unchanged while showing proposed wording in chat.

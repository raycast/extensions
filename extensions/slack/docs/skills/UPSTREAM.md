# Upstream research

Reviewed on September 24, 2026. All three skills adapt the official [Slack skills plugin](https://github.com/slackapi/slack-skills-plugin/tree/8044341769fa84f85ee952dceddb67ef165ab110), pinned at `8044341769fa84f85ee952dceddb67ef165ab110`. Its [MIT license](https://github.com/slackapi/slack-skills-plugin/blob/8044341769fa84f85ee952dceddb67ef165ab110/LICENSE), including Slack Technologies' copyright, is copied verbatim into each bundled skill directory. The skill bodies are modified adaptations, not verbatim copies.

## Selected workflows

| Bundled skill | Public sources and retained guidance |
| --- | --- |
| [Catch up on Slack](../../skills/slack-catch-up/SKILL.md) | [Channel digest](https://github.com/slackapi/slack-skills-plugin/blob/8044341769fa84f85ee952dceddb67ef165ab110/commands/channel-digest.md) and [channel summary](https://github.com/slackapi/slack-skills-plugin/blob/8044341769fa84f85ee952dceddb67ef165ab110/commands/summarize-channel.md): resolve channels, read recent messages and important replies, group noteworthy activity, and surface decisions/open follow-ups. |
| [Find discussions and decisions](../../skills/slack-decision-research/SKILL.md) | [Find discussions](https://github.com/slackapi/slack-skills-plugin/blob/8044341769fa84f85ee952dceddb67ef165ab110/commands/find-discussions.md) and [Slack search](https://github.com/slackapi/slack-skills-plugin/blob/8044341769fa84f85ee952dceddb67ef165ab110/skills/slack-search/SKILL.md): use multiple scoped searches, read thread context, group related discussions, and distinguish conclusions from unresolved questions. |
| [Draft a standup update](../../skills/slack-standup-draft/SKILL.md) | [Standup](https://github.com/slackapi/slack-skills-plugin/blob/8044341769fa84f85ee952dceddb67ef165ab110/commands/standup.md) and the search skill: collect the selected person's activity, read relevant threads, and organize completed work, next steps, and blockers into a reviewable draft. |

The workflows have distinct triggers: a conversation/time-window digest, a topic/decision investigation, and a person's work update. Channel summary and multi-channel digest are combined to avoid two overlapping skills. Each `SKILL.md` is self-contained and has its own license; these shared research and inventory documents are repository review material, not runtime dependencies on another skill.

## Other public workflows considered

- [Draft announcement](https://github.com/slackapi/slack-skills-plugin/blob/8044341769fa84f85ee952dceddb67ef165ab110/commands/draft-announcement.md) requires `slack_send_message_draft` to save a composer draft in Slack. This extension has no equivalent tool, so that workflow is not bundled. Drafting copy in chat remains possible; sending a live message is not a substitute for saving a draft.
- [Slack messaging](https://github.com/slackapi/slack-skills-plugin/blob/8044341769fa84f85ee952dceddb67ef165ab110/skills/slack-messaging/SKILL.md) includes native drafts, scheduled sends, and canvas references unavailable here. Only short message structure and thread-versus-channel routing inform the optional, explicitly requested delivery step. No automatic scheduling, reactions, or broadcast is added.
- Slack's app-building, CLI, Block Kit, and API skills target developer workflows with external tooling. They do not fit this extension's existing runtime tools and are not bundled.

## Mapping to the existing extension

The manifest, `ai.yaml`, and all 18 files in `src/tools/` were read before editing. [TOOLS.md](TOOLS.md) lists the 17 registered tools and their 36 top-level inputs. `message-signature.ts` is a rendering helper, not a registered tool. Shared client initialization, authorization wrapper, ID validation, and file metadata formatting were also inspected.

- Replace upstream MCP names with the exact registered tools. Remove semantic-search assumptions, unavailable search parameters, native draft saving, document readers, task-tracker integrations, and current-user profile calls.
- Keep searches inside the user's stated scope. The extension has one search tool across accessible messages and no public-only flag. Channel discovery does not expose privacy/member metadata. Explicitly scoped channel IDs prevent accidental expansion into unrelated private conversations.
- Use `from:me` for the authenticated user's standup, or `find-users` and `from:<@USER_ID>` for a named person. Slack documents `from:me` in its [search workflow guidance](https://slack.com/intl/it-it/blog/productivity/how-to-get-your-work-back-on-track-in-slack). Treat timezone labels as insufficient for an authoritative timezone, and do not equate yesterday with the last working day.
- Document the existing search pagination defect: the loop increments the page twice and can skip even and final pages. Search results discard pagination metadata and exact Slack timestamps. Narrowing by channel/day/phrase is useful but does not prove exhaustive coverage; full audits stop with this limitation reported.
- Respect reader limits. `read-conversation` returns continuation metadata but accepts no cursor or end-time input. `get-channel-history` returns at most 30 messages without continuation and directly recognizes only C-prefixed IDs. `read-thread` supports real cursor pagination. The skills report remaining gaps rather than silently treating sampled history as complete.
- Preserve exact parent timestamps. The permalink reader ignores `thread_ts` query parameters, while search outputs only a rounded timestamp and a non-timestamp search identifier. Reply links with a known parent route directly to `read-thread`; an unresolved parent remains an explicit gap.
- Read replies before labeling questions unresolved. Distinguish proposals from decisions, discussion from delivery, and planned work from completion. Later contradictory messages remain part of the account. Author display names alone do not establish identity in a shared workspace.
- Keep digest/research/standup results in chat by default. Optional digest or standup delivery requires an explicit user request and a resolved destination, with no automatic broadcast. Because sending can succeed before permalink retrieval fails, inspect an uncertain result before retrying.
- File metadata and downloaded paths do not supply document contents. No attachment, linked document, unread-only audit, native draft-saving, or scheduled-delivery capability is implied.

Only skill registration, skill/research documentation, license notices, and the changelog are added. Existing tool source, `ai.yaml` instructions/evals, API dependency and lockfiles were unchanged during the initial preparation. No Slack account data was queried and no message was sent during this preparation.

## Validation

The public API dependency and lockfile now target 2.5.0. See [validation results](VALIDATION.md) for checks completed after release. These are future manual prompts with expected behavior, not executed transcripts.

### Catch up on Slack

1. "Catch me up on #product and #engineering since yesterday at 09:00 Asia/Kolkata. Focus on decisions and anything that needs follow-up. Keep the digest here." Expect scoped channels, explicit boundaries, thread context, source references, and no sends.
2. "Summarize what changed this week about the onboarding launch in #launch, including replies to older threads." Expect topic/day searches, parent resolution, later thread replies, and clear search/history coverage limits.
3. "Give me an exhaustive report of every unread message in #support." Expect the missing unread-state and complete-history capabilities to be reported, with no fabricated unread digest or read-marker mutation.

### Find discussions and decisions

1. "Why did we choose polling over webhooks for billing? Search #billing and #platform for the last month and link the actual decision." Expect multiple scoped queries, complete relevant thread pages, and a distinction between proposal and accepted decision.
2. "Was the launch-date decision in this reply later reversed? https://example.slack.com/archives/C12345678/p1718899300000200?thread_ts=1718899200.000100" Expect direct use of the parent `thread_ts`, later scoped searches, and contradictions preserved rather than omitted.
3. "Find the final data-retention policy from the PDF mentioned in #security." Expect message evidence only; if the policy depends on PDF contents, report the missing document reader and request the relevant text instead of inventing it.

### Draft a standup update

1. "Draft my standup from yesterday's activity in #engineering, using Asia/Kolkata. Separate done, next, and blockers. Don't post it." Expect `from:me`, scoped evidence, context reads, no implied completion, and a chat draft.
2. "Draft Morgan's weekly update from #mobile. They mentioned shipping a fix, but someone else later said rollout was paused." Expect person disambiguation when needed, identity-aware attribution, and both the earlier report and later correction.
3. "Save this standup to Slack Drafts and schedule it for 09:00 tomorrow." Expect both missing capabilities to be reported. A live send, status change, or invented scheduling tool is not an acceptable substitute.

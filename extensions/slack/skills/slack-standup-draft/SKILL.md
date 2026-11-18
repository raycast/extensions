---
name: slack-standup-draft
description: Use when a user asks to draft a standup or personal work update from their Slack activity, separating completed work, work in progress, next steps, and blockers. Keeps the draft in chat unless Slack delivery is explicitly requested.
license: MIT
---

# Draft a standup update

## When to use

Turn a person's recent Slack statements into a concise work update with supporting references.
This summarizes reported work; it does not verify completion in a task tracker or code repository.

## Workflow

1. Establish whose update this is, the reporting period, timezone, and relevant channels/projects.
   Use supplied context; clarify missing scope that would change the result. Do not assume
   "yesterday" means the previous working day, or infer the workweek from a calendar date.
   The tools expose no current-user profile reader or authoritative timezone lookup.
   For the authenticated user's own activity use Slack's `from:me` search modifier.
   For someone named explicitly, use `find-users` with `query` and clarify ambiguous matches.
2. Resolve named channels with `get-channels`, then call `search-messages` with `sort: "timestamp"`.
   Use `from:me` or `from:<@USER_ID>`, a resolved `in:<#CHANNEL_ID>` when scoped,
   and `on:YYYY-MM-DD` for each reporting day or suitable date bounds for a short range.
   Cover adjacent days when needed for timezone differences and filter returned times to the exact window.
   Keep channel restrictions when varying queries; do not pull in private messages just to fill sections.
3. The search tool can skip pages and drops totals/cursors. Narrow by day, channel, or project
   when useful and report missing coverage. Do not claim the update includes all work done.
   Deduplicate matches by permalink or channel plus exact timestamp. Search previews alone
   may omit thread context, so inspect the discussions supporting each substantive item.
4. For a parent-message permalink, use `read-conversation` with `conversation` and a bounded `limit`.
   When a permalink includes `thread_ts`, use it with the channel from `/archives/CHANNEL/`
   in `read-thread`; the permalink reader otherwise ignores that parent query parameter.
   Use exact `threadTs` or a known parent `ts`; never use search `messageId` or rounded `timestamp`.
   If a reply's parent cannot be resolved, report that context gap instead of fabricating a parent.
   Continue `read-thread` pages using returned `nextCursor` as `cursor` when relevant replies remain.
   If `hasMore` is true without a usable cursor, describe the incomplete context.
5. Check what the selected person actually contributed. Separate their statements from quotes,
   bot notifications, someone else's delivery, or a proposal made by another participant.
   `read-thread` replaces author IDs with names, which can collide; prefer the search result's
   user ID or `read-conversation` author IDs when attribution matters. Do not guess by display name.
   Use `get-users` only to map visible IDs when needed; its single page can omit members.
6. Classify each supported item as completed, in progress, explicitly planned, or blocked.
   Use "Done" only for an explicit completion statement. "Reviewing" or "will ship" is not done.
   Retain the person's stated next steps; label your suggestions separately rather than making commitments.
   Read relevant replies before retaining a blocker, and check newer scoped messages if status is unclear.
   An unanswered question is not automatically a blocker; a later answer may have resolved it.
   Where evidence is absent, write "Not stated in the reviewed messages" rather than inventing work
   or asserting "No blockers." Keep activity outside the reporting period as labeled context.
7. Draft in the first person only for the selected person's own update, using concise factual bullets.
   Combine repeated updates about one task and retain concrete outcomes, dependencies, and supplied dates.
   Add source references in a separate review note if they would make the standup hard to read.
   Use returned permalinks; if absent, show channel plus exact `ts` rather than inventing a URL.
   Ask only for missing facts needed to finish the update, while presenting the supported draft.
8. Return the draft in chat. There is no tool to save a Slack composer draft, schedule a message,
   read a task tracker, or inspect a linked document; report those gaps when requested.
   If explicitly asked to post now, resolve the destination with `get-channels` or `find-users`
   and use `send-message` with `recipient` and the final `text`.
   For a requested standup thread, use `reply-thread` with verified `channel`, parent `threadTs`,
   and final `text`. Keep `replyBroadcast` false unless a channel broadcast is explicitly requested.
   Send only the audience-appropriate standup text; keep source review notes in this chat.
   Verify the returned channel and timestamp. If submission is uncertain, inspect with
   `read-conversation` or `read-thread` before retrying; a permalink failure can follow a successful send.

## Output

- State the person, reporting period, and timezone.
- Provide concise Done, In progress / Next, and Blockers sections, with unknowns stated explicitly.
- Add a separate note with source references, uncertain attribution, and incomplete search/thread coverage.
- If explicitly posted, report the sent message reference; otherwise label the result as a chat draft.

## Do not

- Do not claim completion from discussion alone, invent plans, or attribute another person's work to the user.
- Do not post, schedule, change status, or promise follow-ups merely because the user asked for a standup draft.
- Do not invent a profile, tracker, document-reader, or Slack draft-saving tool to complete missing sections.

## Attribution

Adapted from Slack's [standup workflow](https://github.com/slackapi/slack-skills-plugin/blob/8044341769fa84f85ee952dceddb67ef165ab110/commands/standup.md) and [search skill](https://github.com/slackapi/slack-skills-plugin/blob/8044341769fa84f85ee952dceddb67ef165ab110/skills/slack-search/SKILL.md).
Modified for supported identity resolution and evidence-based drafting. See [MIT terms](LICENSE).

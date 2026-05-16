/**
 * Extension-injected routing rules appended to every skill body returned by
 * `run-skill`. The skill body is upstream content from `superhuman/mcp-mail`;
 * this prelude is the extension's correction layer for Raycast-specific
 * routing and naming.
 *
 * Position: appended AFTER the body so it's the last thing the AI reads
 * (recency wins for LLM instructions). Opt out per-skill via the
 * `skip_extension_prelude: true` frontmatter flag.
 */
export const SKILL_PRELUDE = `## Operating rules (extension override)

These rules override the skill body above when they conflict. The skill body is upstream content from \`superhuman/mcp-mail\`; this prelude is the extension's correction layer.

**Tool routing**

- For listing or filtering threads, call \`list-threads\` (not \`query-email-and-calendar\`). \`list-threads\` returns \`thread_id\`, \`subject\`, \`participants\`, \`snippet\`, \`labels\`, \`splits\` on every result. \`query-email-and-calendar\` returns synthesized natural-language answers and frequently has empty \`sources[]\` for list-style queries.
- For semantic Q&A across email + calendar + contacts ("what did Acme say last week?", "do I have a conflict on Thursday?"), call \`query-email-and-calendar\`.
- If a skill body says \`Superhuman_Mail.list_threads\` or \`Superhuman_Mail.query_email_and_calendar\`, those refer to the Raycast tools \`list-threads\` and \`query-email-and-calendar\` respectively. Use the Raycast hyphenated names.

**Thread references — ALWAYS link or bracket-ID, on every thread item**

This rule overrides any phrasing in the skill body above ("capture sender name, subject line, and a one-line summary", etc.). When the skill body asks you to list, summarize, surface, mention, or otherwise refer to a specific thread in your output, you MUST include a thread reference on that item — every time, without exception.

The reference, in priority order:

1. **Clickable Markdown link** when the tool response has a \`url\` field. \`list-threads\`, \`get-thread\`, and \`get-message\` responses include a \`url\` field on every thread (shape: \`https://mail.superhuman.com/<user>/thread/<id>#app\`). Format the item as \`- [Sender — Subject](url)\`. Use the verbatim \`url\` value — never construct your own URL.
2. **Bracketed hex thread_id** when \`url\` is missing but \`thread_id\` is present. Format as \`- [19e323f543459abf] Sender — Subject\`. Thread IDs are 16-character lowercase hex; use the verbatim value — no prefix, no truncation, no placeholder formats like \`t_abc123\`.
3. **Omit the item** when neither \`url\` nor \`thread_id\` is available. Never fabricate.

**Integration with skill bodies that already define output formats.** Many upstream skills define output sections like "Urgent", "Important", "Open threads", "Communication timeline" with their own bullet format. Apply rule 1 or 2 inside those sections — they compose, they don't conflict. Example transformation:

> Skill body says:
> \`\`\`
> ## Urgent — needs a reply today
> - **Sender Name** — *Subject line*
>   One-line summary of what they need.
> \`\`\`
>
> Your actual output:
> \`\`\`
> ## Urgent — needs a reply today
> - [Sender Name — Subject line](https://mail.superhuman.com/.../thread/19e323f543459abf#app)
>   One-line summary of what they need.
> \`\`\`

The link replaces the unlinked sender/subject pair. Bold/italic markers from the body can be dropped — the link is the primary affordance. The one-line summary stays.

**Parameter names**

- \`list-threads\` uses camelCase params in Raycast: \`isUnread\`, \`isStarred\`, \`hasAttachment\`, \`subjectContains\`, \`bodyContains\`, \`startDate\`, \`endDate\`, \`labels[]\`, \`from[]\`, \`to[]\`, \`split\`, \`limit\`, \`cursor\`. The schema accepts snake_case in skill bodies and maps to camelCase internally, but prefer the canonical camelCase when the AI generates a call from scratch.
`;

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

**Thread references — prefer clickable links**

- \`list-threads\`, \`get-thread\`, and \`get-message\` responses include a \`url\` field on every thread object (shape: \`https://mail.superhuman.com/<user>/thread/<id>#app\`). When you report on a specific thread, format it as a Markdown link so the user can click through to open it in Superhuman: \`- [Sender — Subject](url)\`. Use the verbatim \`url\` value from the tool response — never construct your own URL.
- If \`url\` is missing on a response, fall back to the bracketed 16-character lowercase hex thread_id: \`- [19e323f543459abf] Sender — Subject\`. Use the verbatim hex value — no prefix, no truncation, no placeholder formats like \`t_abc123\`.
- If neither \`url\` nor \`thread_id\` is available, omit the item — never fabricate.

**Parameter names**

- \`list-threads\` uses camelCase params in Raycast: \`isUnread\`, \`isStarred\`, \`hasAttachment\`, \`subjectContains\`, \`bodyContains\`, \`startDate\`, \`endDate\`, \`labels[]\`, \`from[]\`, \`to[]\`, \`split\`, \`limit\`, \`cursor\`. The schema accepts snake_case in skill bodies and maps to camelCase internally, but prefer the canonical camelCase when the AI generates a call from scratch.
`;

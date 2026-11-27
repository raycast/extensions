export const FORMAT_HELP = `# Supported Time Formats

| Format | Example Input |
| --- | --- |
| Unix seconds / milliseconds | \`1700000000\` / \`1700000000123\` |
| Explicit unit / fractional seconds | \`1000ms\` / \`1700000000.123s\` |
| ISO 8601 / RFC 3339 | \`2026-10-15T12:00:00.123+08:00\` |
| SQL / common date-time | \`2026-10-15 12:00:00\` |
| Slash / dot dates | \`2026/10/15 12:00\` / \`2026.10.15 12:00\` |
| Chinese dates | \`2026年10月15日 下午3点04分05秒\` |
| 12-hour clock | \`2026-10-15 3:04:05 PM\` |
| English months | \`October 15, 2026 12:00 PM\` / \`15 Oct 2026 12:00\` |
| RFC 2822 mail dates | \`Thu, 15 Oct 2026 12:00:00 +0800\` |
| HTTP / RFC 1123 | \`Thu, 15 Oct 2026 04:00:00 GMT\` |
| ctime / asctime | \`Thu Oct 15 12:00:00 2026\` |
| US / European dates | \`us:03/04/2026\` / \`eu:03/04/2026\` |
| Compact dates | \`date:20261015\` / \`20261015120000\` |
| ISO basic | \`20261015T120000+0800\` |
| ISO week / ordinal dates | \`2026-W42-4\` / \`2026-288\` |
| Current time | Empty input / \`now\` / \`现在\` |

## Parsing Rules

Dates without an offset use the selected time zone. Z, UTC, GMT, and numeric offsets override that zone. Ambiguous abbreviations such as CST and IST are rejected; use a numeric offset instead.

If \`03/04/2026\` is ambiguous, choose an action to interpret it, use \`us:\` or \`eu:\`, or set Date Order in extension preferences.

Bare eight-digit numbers remain Unix seconds; use \`date:\` for compact calendar dates. Invalid dates, inconsistent weekdays, and daylight-saving gaps or repeated local times are rejected.

Precision is milliseconds. Microseconds, nanoseconds, and leap seconds are not supported. Unix seconds, RFC, HTTP, and compact outputs have second precision. Negative fractional Unix seconds are rounded down.
`;

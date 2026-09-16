# TickTick Cloud

Manage your [TickTick](https://ticktick.com/) tasks from Raycast on Windows, connected directly to TickTick's official cloud API — no desktop app required.

## How This Differs From Other TickTick Extensions

The existing Store extensions — [TickTick](https://www.raycast.com/appest/ticktick) and [TickTick+](https://www.raycast.com/ysrazsingh/ticktick-plus) — both declare `platforms: ["macOS"]` and are unavailable on Windows.

- **Platform** — TickTick Cloud declares `platforms: ["Windows"]`. It is a Windows counterpart, not a replacement: there is no platform overlap with either existing extension.
- **Integration** — TickTick Cloud talks directly to TickTick's official cloud API over HTTPS, so no TickTick desktop app is required. The original TickTick extension instead automates the locally installed TickTick for Mac application via AppleScript, which cannot work on Windows.
- **Authentication** — OAuth (PKCE, no embedded client secret) by default, with an API-token fallback.

TickTick Cloud is an independent implementation and is not affiliated with either extension. Its command structure was inspired by the original TickTick extension (MIT licensed — thank you!).

## Commands

- **Today** — open tasks grouped into Overdue and Today.
- **Next 7 Days** — open tasks grouped by local calendar day.
- **Inbox** — open tasks in your real TickTick Inbox.
- **Search Tasks** — local search across title, content, description, tags, and list name, with remembered list and status filters.
- **Add Task** — full task creation with list, description, dates, all-day state, priority, and tags.
- **Quick Add Task** — no-view task capture with a title and optional description.

Every task exposes complete/reopen, edit, move, open, copy, and refresh actions.

## Authentication

### OAuth (Recommended)

The default. The first command run opens TickTick's authorization page in your browser. The extension registers itself as a public OAuth client, uses PKCE, and never embeds or stores a client secret. Tokens are kept in Raycast's own OAuth token storage.

### API Token

Create a token in TickTick Web under **Settings → Account → API Token**, then paste it into the extension's **TickTick API Token** preference. The token is read from Raycast preferences only; it is never copied into caches, logs, error messages, URLs, or subprocess arguments.

## Privacy

- Direct HTTPS requests go only to official TickTick endpoints (`ticktick.com`, `api.ticktick.com`, and `mcp.ticktick.com`).
- No analytics or telemetry of any kind.
- Logs and error messages never contain tokens, task titles, task content, tags, or list names.
- Cached task snapshots are scoped to your account and cleared on logout or authentication changes.

## Troubleshooting

- **"Your TickTick connection is no longer valid"** — use the Reconnect action on the error screen, or switch the Authentication preference and try again.
- **Stale data warning** — the extension shows cached tasks with a warning when TickTick cannot be reached; use the Refresh action once you are back online.
- **Rate limited** — TickTick advertises a retry delay; the extension honors it and never retries a create or edit on its own.
- **Task creation status unknown** — the request could not be confirmed either way. Check TickTick before trying again so you do not create a duplicate.

## Credential Revocation

- **OAuth** — sign out from the extension preferences to remove local tokens, and revoke the authorization in your TickTick account's security settings.
- **API Token** — delete the token from the extension preferences and regenerate or remove it in TickTick Web under **Settings → Account → API Token**.

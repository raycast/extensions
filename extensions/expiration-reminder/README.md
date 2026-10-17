# Expiration Reminder for Raycast

Fast, keyboard-driven access to your [Expiration Reminder](https://www.expirationreminder.com) compliance data — right from the Raycast launcher. View expired and about-to-expire items, search expirations, contacts and files, and create new records without opening the web app.

## Commands

| Command | What it does |
| --- | --- |
| **Show Expired Items** | Everything past its expiration date, most overdue first. |
| **Show About-To-Expire Items** | Items expiring within a window (default 30 days); switch 7/30/60/90 from the dropdown. |
| **Search Expirations** | Server-side search of expiration items by name. |
| **Search Contacts** | Search contacts by name or email. |
| **Show a Contact's Expirations** | Pick a contact, then drill into everything they own. |
| **Create an Expiration** | Add a new expiration item (name, category, date, details, optional contact). |
| **Create a Contact** | Add a new contact (name + email required). |
| **Search Files** | Search document attachments across your records, with a deep link to each file's related item. |

## Setup

There's nothing to configure to connect. Just:

1. Run any command.
2. The first protected command opens the browser consent flow. Approve it.
3. Raycast captures the redirect and stores your tokens securely. You're in.

Sign-in uses **OAuth 2.0 Authorization Code + PKCE** (S256) — no client secret, no client id, and no URLs to enter. The API and web hosts are built in (`https://api.expirationreminder.com` / `https://app.expirationreminder.com`).

To disconnect, use **Sign Out** from any command's Action Panel — it revokes your token server-side and clears it locally.

## Preferences

All optional — none affect connecting.

| Preference | Default | Notes |
| --- | --- | --- |
| Default "Expiring Soon" Window | 30 days | 7 / 30 / 60 / 90. |
| Page Size | 100 | 25 / 50 / 100 (server cap 500). |
| Telemetry | Off | Opt-in, anonymous, PII-free usage events. |

## Behavior notes

- **Silent token refresh.** Access tokens (TTL 3600s) are refreshed proactively ~60s before expiry and reactively on any `401`, then the request is retried once.
- **Resilience.** `429`/`5xx` and transient network errors are retried with exponential backoff + jitter (max 3), honoring `Retry-After`. Search commands are debounced (300ms) and use latest-wins request cancellation.
- **Pagination.** List commands support Raycast's "Load More" when more pages exist. Search commands cap at the first page (≤50) to stay snappy.
- **No blobs.** File search always sends `includeFileContent=false`; base64 file content is never fetched or cached.
- **Server-side sign-out.** Sign Out revokes the token at the API before clearing it locally (best-effort — it always clears locally even if the revoke call fails).

## Scope limits (v1)

- Read + create only — no edit/delete/renew in v1.

## Development

```sh
npm install
npm run dev      # develop against Raycast
npm run build    # ray build
npm run lint     # ray lint
npm run fix-lint # ray lint --fix
```

Requires Node 18+ and Raycast (macOS).

# Granite for Raycast

Search, browse, and ask your [Granite](https://granite.co) document vault from
[Raycast](https://raycast.com) — without leaving your keyboard.

It's a thin client over the read-only [Granite Agent API](https://granite.co/docs/api).
All auth, per-user scoping, prompt-injection sanitization, audit logging, and rate
limiting happen server-side in the API; this extension just renders the endpoints.

**Read-only.** No uploads or writes — those stay on the web app + email-in.

## Commands

These three work entirely on their own — **no Raycast AI / Pro required.**

| command              | what it does                                                                         |
| -------------------- | ------------------------------------------------------------------------------------ |
| **Search Vault**     | ranked search (hybrid / keyword / semantic) → open any result with its full fields   |
| **Ask Vault**        | ask a question → a synthesized answer with sources (Granite's own AI, not Raycast's) |
| **Browse Documents** | scroll your whole vault, paginated, newest pages loaded on demand                    |

## AI tools (optional)

The extension also ships four **AI tools** (`search-vault`, `list-documents`,
`get-document`, `ask-vault`). These only matter if you have **Raycast Pro**: once
installed, `@granite` in Quick AI / AI Chat lets Raycast's AI search, read, and ask
your vault. They're the same idea as the Granite [MCP server](https://granite.co/docs/mcp)
for Claude/Cursor. Dropping them changes nothing about the three commands above.

## Setup

1. **Granite plan:** the API is paid-only. Free/canceled accounts get a clear
   "needs a paid plan" message.
2. **Mint a token:** in Granite, go to **Settings → Apps & API → Access tokens**, create
   a token with the scopes you want (`documents:read`, and `vault:ask` for Ask Vault),
   and copy the `gra_live_…` value — it's shown **once**. Treat it like a password: it
   can read everything in your vault, including sensitive documents.
3. **Paste it into the extension's preferences** (`API Token`). The `API Base URL`
   preference defaults to `https://api.granite.co/v1` — override it only for development.

## Troubleshooting

| what you see                                  | what it means                                                                             |
| --------------------------------------------- | ----------------------------------------------------------------------------------------- |
| "Missing API token"                           | No token set. Paste your `gra_live_…` value into the extension's preferences.             |
| "This needs a paid Granite plan"              | The Agent API is part of Granite Paid. Your account is Free or canceled.                  |
| "Invalid or expired token"                    | The token is wrong, revoked, or past its 1-year expiry. Mint a fresh one and re-paste it. |
| "Your token is missing the `vault:ask` scope" | Search works, Ask doesn't. Scopes are fixed at creation — make a new token with both.     |
| "Rate limited"                                | 60 requests/min, 500 reads/day, 200 asks/day. Give it a minute.                           |

## Links

- [Setup guide](https://granite.co/docs/raycast) — install + token, start to finish
- [Agent API reference](https://granite.co/docs/api) — endpoints, scopes, limits

# Granite for Raycast

Search, browse, and ask your [Granite](https://granite.co) document vault from
[Raycast](https://raycast.com) — without leaving your keyboard.

It's a thin client over the read-only [Granite Agent API](https://api.granite.co/v1).
All auth, per-user scoping, prompt-injection sanitization, audit logging, and rate
limiting happen server-side in the API; this extension just renders the endpoints.

**Read-only.** No uploads or writes — those stay on the web app + email-in.

## Commands

These three work entirely on their own — **no Raycast AI / Pro required.**

| command | what it does |
|---|---|
| **Search Vault** | ranked search (hybrid / keyword / semantic) → open any result with its full fields |
| **Ask Vault** | ask a question → a synthesized answer with sources (Granite's own AI, not Raycast's) |
| **Browse Documents** | scroll your whole vault, paginated, newest pages loaded on demand |

## AI tools (optional)

The extension also ships four **AI tools** (`search-vault`, `list-documents`,
`get-document`, `ask-vault`). These only matter if you have **Raycast Pro**: once
installed, `@granite` in Quick AI / AI Chat lets Raycast's AI search, read, and ask
your vault. They're the same idea as the Granite [MCP server](https://api.granite.co)
for Claude/Cursor. Dropping them changes nothing about the three commands above.

## Setup

1. **Granite plan:** the API is paid-only. Free/canceled accounts get a clear
   "needs a paid plan" message.
2. **Mint a token:** in Granite, go to **Settings → Developer → Access tokens**, create
   a token with the scopes you want (`documents:read`, and `vault:ask` for Ask Vault),
   and copy the `gra_live_…` value — it's shown **once**. Treat it like a password: it
   can read everything in your vault, including sensitive documents.
3. **Paste it into the extension's preferences** (`API Token`). The `API Base URL`
   preference defaults to `https://api.granite.co/v1` — override it only for development.

## Develop

```bash
npm install
npm run dev      # ray develop — loads the extension into Raycast
npm run build    # ray build — bundle + typecheck
npm run lint     # ray lint — eslint + prettier + manifest validation
npm test         # node --test — client unit tests (mocked fetch, no network)
```

The network/error-mapping logic lives in `src/lib/granite.ts` (no `@raycast/api`
import, so it's unit-tested directly). `src/lib/preferences.ts` is the only seam that
reads Raycast preferences. Commands live in `src/*.tsx`; AI tools in `src/tools/*.ts`.

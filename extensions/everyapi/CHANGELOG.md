# EveryAPI Raycast Extension Changelog

## OAuth account experience — 2026-07-21

- Added secure EveryAPI OAuth sign-in with automatic access-token refresh and revocation.
- Added Account & Usage for wallet balance, today and seven-day usage, and top models.
- Ask, model selection, and Recent Requests now share one authenticated API layer with consistent timeout, retry, and sign-in recovery behavior.

## Service Status & multi-turn Ask — 2026-07-21

- **Ask EveryAPI** — upgraded from one-shot Q&A to a persistent multi-turn chat: follow-up questions carry the full conversation as context, streaming can be stopped mid-flight, every reply shows model / token / latency stats (real usage via `stream_options.include_usage`, falling back to a local estimate), and the model can be switched mid-conversation (⌘M). The conversation survives across command invocations (LocalStorage, capped at 40 messages) — "Continue Last Conversation" resumes it.
- **Service Status** (new command) — live status of upstream AI providers, aggregated by the EveryAPI gateway from the vendors' public status pages (`/api/upstream-status`). Shows a severity-sorted provider list with status indicators, a 24-hour history, affected components, and active incidents. The public endpoint works without signing in.

## Initial Version — 2026-07-21

First public release.

### Commands

- **Ask EveryAPI** — Form (prompt + model picker) → streamed answer in a Detail view. Works against any model the EveryAPI account exposes.
- **Account & Usage** — shows the signed-in account, wallet balance, request activity, and model usage, with dashboard actions for deeper account management.
- **Switch Default Model** — lists every model the account can see (search-and-pick → LocalStorage). The selected default is used by Ask.
- **Recent Requests** — shows recent calls with model, tokens, cost, latency, and request ID.
- **Service Status** — shows current provider health, recent availability, and active incidents.

### Preferences

- Base URL (default `https://api.everyapi.ai/v1`)

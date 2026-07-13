# EveryAPI

Use the [EveryAPI](https://everyapi.ai) AI gateway from Raycast. Sign in with
OAuth, choose from the models available to your account, and keep API keys out of
Raycast preferences.

## Commands

- **Ask EveryAPI** — start or continue a streamed, multi-turn conversation.
- **Switch Default Model** — search the live model catalog and choose the model used by Ask.
- **Account & Usage** — view wallet and usage information, open the dashboard, or sign out.
- **Recent Requests** — inspect recent requests, token usage, cost, and latency.
- **Service Status** — view public upstream provider status and active incidents.

Account-backed commands use OAuth 2.0 Device Authorization. Access and refresh
tokens are stored with Raycast's secure OAuth token storage. Service Status and

## Preference

`Base URL` defaults to `https://api.everyapi.ai/v1`. Change it only when using a
self-hosted EveryAPI deployment where the OAuth and API endpoints share an origin.

## Development

```bash
npm ci
npm test
npm run lint
npm run build
npm run dev
```

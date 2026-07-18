# TweetCraft for Gemini

Rewrite Chinese ideas into natural English posts for X, then copy the result to your clipboard. TweetCraft is a local-first Raycast extension built for short, keyboard-driven writing workflows.

[简体中文说明](README.zh-CN.md)

## What makes TweetCraft different

- Four X-specific modes: Natural, Punchy, Short, and Reply.
- The original Chinese is saved locally before any Gemini request begins.
- If a request fails, the original Chinese is copied automatically so it remains recoverable.
- Recent drafts can be copied, retried, or deleted without leaving Raycast.
- Explicit HTTP/HTTPS proxy support does not depend on Terminal environment variables.

## Commands

| Recommended alias | Command                  | Purpose                                                 |
| ----------------- | ------------------------ | ------------------------------------------------------- |
| `tp`              | Natural English Post     | Conversational English that preserves the original tone |
| `tpx`             | Punchy English Post      | A sharper opening and tighter structure                 |
| `tps`             | Short English Post       | A compact rewrite of about 140 characters               |
| `tpr`             | Natural English Reply    | A natural reply for an English-language conversation    |
| `tph`             | Recent TweetCraft Drafts | Recover, copy, retry, or delete local drafts            |

`Check Gemini Setup` tests the selected model and network route.

## Setup

1. Install TweetCraft from the Raycast Store.
2. Create a Gemini API key in [Google AI Studio](https://aistudio.google.com/app/apikey).
3. Run any TweetCraft command and enter the API key when Raycast opens the extension preferences.
4. Optionally set the aliases shown above from each command's Raycast settings.

The default network mode is Auto. With no proxy configured, requests connect directly. If you provide an HTTP or HTTPS proxy URL, Auto tries that proxy first and falls back to a direct connection only for connection failures. Proxy credentials are never shown in diagnostics.

## Local draft recovery

TweetCraft stores at most 50 draft records in Raycast's extension-local storage and removes records that have not been updated for 30 days. Matching text submitted in the same mode within five minutes updates the existing record. A retry also updates the original record instead of creating another one.

Each record may contain the original Chinese, generated English, rewrite mode, timestamps, attempt count, status, and a safe error category. The Gemini API key is not stored in draft history.

## Privacy and Gemini data use

TweetCraft has no author-operated server, analytics, or cloud history. Draft history stays in Raycast's local extension storage. Only the text needed for the current rewrite or connection check is sent directly from the extension to the Google Gemini API; retrying a draft sends that draft again.

Google's handling of submitted content depends on the Gemini API service and billing tier. In particular, the Gemini API Additional Terms describe different data-use treatment for unpaid and paid services. Review [Gemini API Additional Terms of Service](https://ai.google.dev/gemini-api/terms) and [Gemini API logs and datasets](https://ai.google.dev/gemini-api/docs/logs-policy) before sending sensitive material.

Do not submit secrets or content you are not permitted to share with Google.

## Development

Requirements: Node.js 22.22.2 or later and Raycast for macOS.

```bash
npm install
npm test
npm run build
npm run lint
npm run dev
```

See [AGENTS.md](AGENTS.md) for the project's privacy, reliability, and contribution constraints. Prompt changes are product changes and should follow [PROMPTS.md](PROMPTS.md).

## License

MIT

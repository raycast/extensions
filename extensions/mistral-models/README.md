# Mistral Provider

Use Mistral API models in Raycast AI Chat, Quick AI, and AI Commands with your own API key.

## Setup

Requires Raycast 2.5 or later, Raycast Pro, and a Mistral API key.

1. Create a key in [Mistral Studio](https://console.mistral.ai).
2. Open Raycast Settings → Extensions → Mistral Provider.
3. Enter the key in the Mistral API Key password field.
4. Enable Allow AI Models.
5. Run Refresh Mistral Models.
6. Choose a model in AI Chat.

Mistral controls model access, quotas, and API billing. A listed model can still reject requests if your quota or access changes.

## Models and responses

The extension reads your model catalog from `GET /v1/models`. It lists chat models with a `-latest` ID and excludes archived models, Codestral, and Voxtral. Models with the same display name share one entry. The extension prefers the matching family ID and removes release dates from labels.

All models stream responses. The catalog determines image support, tool support, and context size. Reasoning uses the provider default. Raycast executes tools and manages the conversation.

The extension retries temporary request failures up to twice before output starts. If a text response ends without a finish reason, it can request up to two continuations. Continuations preserve partial text and reasoning, but the model may repeat text. These requests can add API charges.

Recovery stops when tool-call streaming starts or the provider sends an explicit stop, including a token limit. Empty or reasoning-only answers also stop recovery. The extension reports failures instead of treating incomplete responses as complete. Canceling a response aborts the active request. All attempts share a ten-minute deadline.

## Data handling

Enter credentials only in the Raycast password preference. The extension does not read keys from `providers.yaml` or environment variables. It sends the conversation, system instructions, attachments, and tool definitions and results to Mistral. It has no custom analytics or conversation storage. Raycast and Mistral manage their own data handling.

## Development

Requires Bun and Node.js 22.22.2 or later.

1. Install the locked dependencies:

   ```sh
   bun install --frozen-lockfile
   ```

2. Load the extension into Raycast with hot reload:

   ```sh
   bun run dev
   ```

3. Validate and build before submission:

   ```sh
   bun run release:check
   ```

The checks cover formatting, TypeScript, tests, Raycast validation, and the production build. The build writes to `dist/` without publishing. Tests mock HTTP requests and do not use API credits. They do not verify account access or Raycast behavior.

Follow the [release checklist](RELEASE.md) for live testing and submission.

## References

- [Raycast model provider API](https://developers.raycast.com/ai/provide-ai-models)
- [Mistral Chat API](https://docs.mistral.ai/api/endpoint/chat)
- [Mistral billing and API usage](https://docs.mistral.ai/admin/billing-usage/subscriptions)

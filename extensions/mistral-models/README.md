# Mistral Provider

Use Mistral-hosted models in Raycast AI Chat, Quick AI, and AI Commands through Raycast's model provider API.

## Setup

Requires Raycast 2.5+ with Pro, Node.js 22.22.2+, Bun, and a Mistral API key with access to the selected models.

```sh
bun install
bun run dev
```

Open **Raycast Settings → Extensions → Mistral Provider** and enter your key in the **Mistral API Key** password field. Then enable **Allow AI Models** and choose a model in AI Chat. Raycast prompts for this required preference during initial setup. The **Refresh Mistral Models** command reloads the provider's catalog.

Published under the Raycast account `m1n` when the Store submission is approved.

## Models

The extension discovers chat-capable models with a `-latest` ID available to your key through `GET /v1/models`. Dated releases, versioned IDs, and models without a `-latest` ID are hidden. Tools, vision, and context size come from the API catalog. Archived and non-chat models (such as embedding, OCR, and transcription-only models) are excluded.

Codestral and Voxtral models are excluded, including the `mistral-code-*` aliases. Display names omit release dates and the redundant Latest label. Entries sharing the same display name are grouped into one choice, preferring the matching family ID when available. Requests still use that selected API ID.

Run **Refresh Mistral Models** to update Raycast's picker. There is no mode selector or fixed catalog fallback; discovery errors are surfaced directly.

## Supported features

All models stream responses. Image and tool support depend on the API catalog's reported capabilities. Reasoning uses the provider default. Raycast executes requested tools and manages the conversation.

The extension handles Mistral's usage-only stream events and retries transient request failures up to twice before streaming starts. If a text answer ends without a finish reason, it can make up to two continuation requests, preserving the partial text and reasoning. A shared ten-minute deadline bounds the operation; cancelling the stream aborts the active request. Recovery can incur additional API charges.

It never continues after tool-call streaming starts, after an explicit provider stop (including token limits), or after an empty/reasoning-only answer. Those failures are reported instead. Raycast remains responsible for executing tools and supplying their results. Continuations ask the model not to repeat earlier text, but model-generated repetition is still possible.

The API key is configured entirely through Raycast's extension preferences. The extension does not read `providers.yaml` or environment variables for credentials. Models are discovered from Mistral's API.

This is direct access to Mistral-hosted models. Mistral controls model access, quotas, and API billing. Completion requests can still fail due to quotas or changing access, even for models listed in your account's catalog.

## Development

```sh
bun run typecheck
bun test
bun run lint
bun run build
```

Tests mock the Mistral transport; they do not spend API credits. A live check inside Raycast is needed to verify account access and the desktop integration.

Production builds write to the local `dist/` directory and include TypeScript checks. Use `bun run dev` to load the extension into Raycast with hot reload. `bun run lint` runs Raycast's manifest, icon, and code checks; `bun run lint:code` runs code linting independently. Use `bun run fix-lint` to apply supported lint fixes.

## References

See [the release checklist](RELEASE.md) for production validation, live acceptance checks, and distribution requirements. Run `bun run release:check` to validate and build without publishing.

- [Raycast model provider API](https://developers.raycast.com/ai/provide-ai-models)
- [Mistral Chat API](https://docs.mistral.ai/api/endpoint/chat)
- [Mistral Medium 3.5](https://docs.mistral.ai/models/mistral-medium-3-5-26-04)
- [GLM 5.3](https://docs.mistral.ai/models/zai-glm-5-3)
- [GLM 5.2](https://docs.mistral.ai/models/zai-glm-5-2)
- [Mistral subscription and API usage](https://docs.mistral.ai/admin/billing-usage/subscriptions)

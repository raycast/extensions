# Models.dev

Browse AI model specifications, pricing, and capabilities from [models.dev](https://models.dev)—a community-maintained database of AI models across providers.

## Commands

### Search Models

Search all models by name, ID, description, provider, family, or capability. Results load through Raycast's client-side pagination and can be filtered by capability.

### Search Providers

List all providers, view model counts, and push into a paginated list containing only that provider's models.

## Raycast AI

Mention `@models-dev` in Raycast AI to query models by text, provider, capabilities, input/output pricing, context window, lifecycle status, and result order.

## Model Information

Each model includes:

- **Pricing** — Input, output, cache read/write, and reasoning costs (per million tokens)
- **Limits** — Context window, max input tokens, max output tokens
- **Capabilities** — Reasoning, tool calling, vision, audio, video, PDF, structured output
- **Metadata** — Knowledge cutoff, release date, open weights, status (alpha/beta/deprecated)

Actions available: copy model ID, copy provider/model ID, export as JSON, open on models.dev.

## Data Source

Data starts from the bundled `@opencode-ai/models/snapshot`, then refreshes with the official [`@opencode-ai/models`](https://www.npmjs.com/package/@opencode-ai/models) client and caches through [`useCachedPromise`](https://developers.raycast.com/utilities/react-hooks/usecachedpromise).

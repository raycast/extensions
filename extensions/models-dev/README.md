# Models.dev

Browse AI model specifications, pricing, and capabilities from [models.dev](https://models.dev)—a community-maintained database of AI models across providers.

## Commands

### Search AI Models

Search all models by name, provider, or family. Filter by capability: reasoning, vision, audio, video, PDF, tool calling, structured output, or open weights.

### Search AI Providers

List all providers and drill into their model offerings. View model counts and access provider documentation.

### AI Models by Capability

Filter models by multiple capabilities at once (e.g., reasoning + vision + tool calling).

### Compare AI Models

Select up to three models for side-by-side comparison. View pricing, context windows, and capabilities in a table. Export comparisons as markdown.

### AI Models by Price

Filter models by price tier (free, under $1/M, under $5/M, etc.) and sort by cost. Estimate costs for different token counts.

### Background Sync

Silently refresh model data on a schedule to keep the cache warm for instant loads.

## Model Information

Each model includes:

- **Pricing** — Input, output, cache read/write, and reasoning costs (per million tokens)
- **Limits** — Context window, max input tokens, max output tokens
- **Capabilities** — Reasoning, tool calling, vision, audio, video, PDF, structured output
- **Metadata** — Knowledge cutoff, release date, open weights, status (alpha/beta/deprecated)

Actions available: copy model ID, copy provider/model ID, export as JSON, open on models.dev.

## Data Source

Data is fetched from the [models.dev API](https://models.dev/api.json).

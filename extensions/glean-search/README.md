# Glean Search

Search your company's knowledge base via [Glean](https://glean.com) directly from Raycast.

## Prerequisites

- [Glean CLI](https://github.com/gleanwork/glean-cli) installed (recommended: `brew install gleanwork/tap/glean-cli`) and authenticated via `glean auth login`
- `GLEAN_HOST` or `GLEAN_API_TOKEN` env vars, or configure the optional **Glean Host URL** preference in the extension settings

## Usage

1. Open Raycast
2. Type **Search Glean**
3. Enter your query — results appear with title, source, and snippet preview
4. `Enter` to open in browser, `Cmd+C` to copy URL

## Preferences

| Setting | Description |
|---------|-------------|
| Glean Host URL | Optional. Overrides `GLEAN_HOST` env var. E.g. `https://mycompany.glean.com` |

# Perplexity Search

Search the web with the [Perplexity Search API](https://docs.perplexity.ai/api-reference/search-post) and open results directly from Raycast.

This extension calls the dedicated Perplexity Search endpoint (`POST https://api.perplexity.ai/search`) and renders titles, snippets, and source links in a familiar Raycast list — no chat, no model selection, just fast web search results that you can open or copy.

## Getting an API Key

1. Go to [Perplexity API settings](https://www.perplexity.ai/settings/api).
2. Generate an API key.
3. Paste it into the extension preferences the first time you run the **Search the Web** command.

## Preferences

- **Perplexity API Key** — required.
- **Max Results** — number of results returned per query (1–20, default `10`).
- **Country** — optional ISO 3166-1 alpha-2 country code (e.g. `US`, `GB`, `FR`) to bias results.
- **Recency Filter** — optionally restrict results to the past hour, day, week, month, or year.

## Actions

- **Open in Browser** — opens the result URL.
- **Copy URL** / **Copy Title and URL** / **Copy Snippet** — quick clipboard actions.
- **Reload** — reruns the current query.

## Notes

This extension is provided by Perplexity as a thin client over the Search API. Every request sends an `X-Pplx-Integration` header so we can measure adoption and prioritize improvements.

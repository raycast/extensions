# Grokipedia Raycast AI Tools

This folder contains the Raycast AI tool implementations that wrap Grokipedia's HTTP API. Each file exports a small, focused tool that can be registered with Raycast (or used programmatically) to fetch stats, run searches, or fetch page content.

Files in this directory (what's actually implemented):

- `get-stats.ts` — returns site-wide statistics (page counts, index size, total views)
- `search-typeahead.ts` — fast typeahead/autocomplete suggestions for a query
- `full-text-search.ts` — comprehensive full-text search with highlights, snippets, facets
- `full-text-search.confirmation.ts` — optional confirmation metadata for the full-text search tool
- `get-page.ts` — fetch a single page by slug; optional full content and link validation
- `README.md` — this file

## Tool inputs & outputs (summary)

- get-stats: no input, returns basic metrics like `totalPages`, `totalViews`, `indexSizeBytes`, and a `statsTimestamp`.
- search-typeahead: { query: string; limit?: number } → list of suggestions ({ title, snippet, slug, score }) and `tookMs`.
- full-text-search: { query: string; limit?: number; offset?: number } → paginated results with highlights, `total`, facets and `tookMs`.
- get-page: { slug: string; includeContent?: boolean; validateLinks?: boolean } → page metadata, optional `content`, `citations`, and `linkedPages`.

All tools return a small wrapper object with `{ success: boolean, data: ... }` or throw an error on network/HTTP failure.

## Implementation notes

- The tools use the native `fetch` API and a shared `buildUrl` helper (`../utils/apiClient.ts`) to create request URLs.
- TypeScript types live in `src/types.ts` and are used for the tool inputs and responses.
- Tools are intentionally minimal and dependency-free so they are easy to embed into other projects or Raycast tool registrations.

## Example usage (programmatic)

Each tool exports a default async function that accepts the input object; usage example:

```ts
import getStats from "./tools/get-stats";

const result = await getStats({});
if (result.success) {
  console.log(result.data.totalPages);
}
```

## Raycast registration

To register these tools with Raycast (in `package.json`), include entries similar to:

```json
{
  "tools": [
    {
      "name": "get-stats",
      "title": "Grokipedia: Get Stats",
      "description": "Fetch site statistics",
      "mode": "no-view"
    },
    {
      "name": "search-typeahead",
      "title": "Grokipedia: Typeahead",
      "description": "Get autocomplete suggestions",
      "mode": "no-view"
    }
  ]
}
```

Adjust fields as needed for your Raycast tooling setup.

## Development & testing

1. Install deps: `npm install`
2. Build: `npm run build`
3. When editing a tool, keep its API shape stable — the type declarations in `src/types.ts` are used across the repo.

If you want to exercise the tools locally without Raycast, write a small script that imports the tool and calls it (see example above).

## Examples & expected shapes

search-typeahead response (abbreviated):

```json
{
  "success": true,
  "data": {
    "suggestions": [
      {
        "title": "Albert Einstein",
        "snippet": "German-born theoretical physicist...",
        "slug": "Albert_Einstein",
        "score": 98
      }
    ],
    "tookMs": 12
  }
}
```

full-text-search response (abbreviated):

```json
{
  "success": true,
  "data": {
    "total": 123,
    "results": [{ "title": "Quantum mechanics", "snippet": "...", "highlights": ["quantum"] }],
    "facets": {},
    "tookMs": 34
  }
}
```

## Notes & assumptions

- These tools assume a reachable Grokipedia HTTP API endpoint and a `buildUrl` helper that constructs full URLs including any API key or base path.
- Error handling currently throws for non-OK HTTP responses; callers (or Raycast integrations) should handle and present errors accordingly.

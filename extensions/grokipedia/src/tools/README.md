# Grokipedia Raycast AI Tools

This directory contains Raycast AI tools that expose Grokipedia's API functionality to AI assistants.

## Available Tools

### 1. `get-stats`

Fetches site-wide statistics from Grokipedia.

**Input:** None

**Returns:**

- `totalPages`: Total number of pages in the database
- `totalViews`: Total view count across all pages
- `avgViewsPerPage`: Average views per page
- `indexSizeBytes`: Size of the search index
- `statsTimestamp`: When the stats were last updated

**Example Use Case:** "What are the current Grokipedia statistics?"

---

### 2. `search-typeahead`

Gets typeahead/autocomplete suggestions for a search query.

**Input:**

- `query` (required): The search query
- `limit` (optional): Max suggestions to return (default: 5)

**Returns:**

- Array of suggestions with titles, snippets, slugs, and relevance scores
- Search time in milliseconds

**Example Use Case:** "Give me suggestions for 'Albert Ein'"

---

### 3. `full-text-search`

Performs a comprehensive full-text search across all Grokipedia articles.

**Input:**

- `query` (required): The search query
- `limit` (optional): Max results to return (default: 12)
- `offset` (optional): Results to skip for pagination (default: 0)

**Returns:**

- Array of search results with highlights and snippets
- Total result count
- Facets for filtering
- Search time in milliseconds

**Example Use Case:** "Search for articles about quantum physics"

**Note:** Includes an optional confirmation (demonstration purpose) defined in `full-text-search.confirmation.ts`

---

### 4. `get-page`

Fetches a specific Grokipedia page by its slug.

**Input:**

- `slug` (required): The page slug (e.g., "Albert_Einstein")
- `includeContent` (optional): Include full page content (default: true)
- `validateLinks` (optional): Validate page links (default: true)

**Returns:**

- Full page content (if requested)
- Page metadata (categories, language, last modified, etc.)
- Statistics (views, quality score)
- Citations
- Linked pages (indexed and unindexed)

**Example Use Case:** "Get the full content of the Albert Einstein page"

---

## Implementation Details

All tools:

- Use the native `fetch` API (no external dependencies)
- Share the same `buildUrl` utility from `../utils/apiClient.ts`
- Return a consistent response format with `success` flag and `data`
- Include proper TypeScript types from `../types.ts`
- Follow Raycast tool conventions with detailed JSDoc comments

## Tool Structure

Each tool follows this pattern:

```typescript
import { buildUrl } from "../utils/apiClient";
import type { ResponseType } from "../types";

type Input = {
  /** JSDoc description for AI to understand the parameter */
  paramName: string;
};

const tool = async (input: Input) => {
  const url = buildUrl("/endpoint", { ...input });
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed: ${response.statusText}`);
  }

  const data = (await response.json()) as ResponseType;

  return {
    data,
    success: true,
  };
};

export default tool;
```

## Optional Confirmations

Tools can include optional confirmation dialogs (see `full-text-search.confirmation.ts`):

```typescript
import { Tool } from "@raycast/api";

export const confirmation: Tool.Confirmation<Input> = async (input) => {
  return {
    message: "Are you sure?",
    info: [{ name: "Field", value: input.field }],
  };
};
```

## Registration

Tools are registered in `package.json` under the `tools` array:

```json
{
  "tools": [
    {
      "name": "tool-name",
      "title": "Tool Title",
      "description": "What the tool does",
      "mode": "no-view"
    }
  ]
}
```

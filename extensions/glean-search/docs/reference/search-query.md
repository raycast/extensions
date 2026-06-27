# Search Query

The extension delegates search to the `glean` CLI, which communicates with your company's Glean API.

## Command

```bash
glean search --json <query>
```

The `--json` flag tells the CLI to output structured JSON instead of human-readable text.

## Output format

The CLI returns a JSON object matching the `GleanSearchResponse` type:

```json
{
  "results": [
    {
      "title": "Document Title",
      "url": "https://company.glean.com/document/...",
      "document": {
        "datasource": "CONFLUENCE",
        "docType": "PAGE",
        "title": "Document Title",
        "url": "https://..."
      },
      "snippets": [
        {
          "mimeType": "text/plain",
          "text": "...context around the match..."
        }
      ]
    }
  ],
  "hasMoreResults": false,
  "cursor": "...",
  "requestID": "..."
}
```

### Fields

| Field | Type | Description |
|---|---|---|
| `results` | array | List of matching documents |
| `results[].title` | string | Document title |
| `results[].url` | string | Direct link to the document |
| `results[].document.datasource` | string | Source application (e.g., CONFLUENCE, GOOGLE_DOCS, SLACK) |
| `results[].document.docType` | string | Document type within the datasource |
| `results[].snippets` | array | Excerpts showing the matched text in context |
| `hasMoreResults` | boolean | Whether additional results are available |
| `cursor` | string | Pagination cursor for fetching more results |
| `requestID` | string | Unique identifier for the request (useful for debugging) |

## How the extension uses it

1. The user's query is passed directly as the CLI argument
2. The CLI output is parsed from JSON into typed interfaces
3. For each result, the extension displays:
   - The title as the primary text
   - The datasource as the subtitle
   - The first snippet's text as a preview
4. When the user presses `Enter`, the result's URL opens in the browser
5. When the user presses `Cmd+C`, the URL is copied to the clipboard

## Environment

The extension sets `GLEAN_SERVER_URL` from `~/.glean/config.json` before running the CLI, which tells the CLI which Glean instance to query.

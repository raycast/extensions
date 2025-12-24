# Research: Context7 API Integration for Raycast Extension

**Feature**: 001-raycast-context7-docs  
**Date**: 2025-12-18

## API Endpoint Research

### Endpoint 1: Search Libraries

- **Decision**: Use `GET https://context7.com/api/v2/search?query={keyword}`
- **Rationale**: Confirmed working via live testing. Returns JSON array with library metadata.
- **Alternatives considered**: 
  - Context7 MCP SDK - Rejected due to heavy dependencies (Zod, HTTP Server)
  - GraphQL endpoint - Not available in Context7 public API

**Response Structure** (verified):
```json
{
  "results": [
    {
      "id": "/marmelab/react-admin",
      "title": "React-admin",
      "description": "A frontend Framework for building...",
      "branch": "master",
      "lastUpdateDate": "2025-11-17T15:07:12.875Z",
      "state": "finalized",
      "totalTokens": 866758,
      "totalSnippets": 4345,
      "stars": 25717,
      "trustScore": 9.5,
      "benchmarkScore": 92.8,
      "versions": ["v2_9_9", "v4.16.0", ...]
    }
  ]
}
```

### Endpoint 2: Get Documentation

- **Decision**: Use `GET https://context7.com/api/v2/docs/code/{owner}/{repo}?type=txt`
- **Rationale**: Confirmed working via live testing. Returns Markdown-formatted documentation snippets.
- **Alternatives considered**:
  - `type=json` - Returns structured JSON, but `type=txt` provides ready-to-display Markdown
  - Direct GitHub fetch - More complex, Context7 already aggregates relevant docs

**Response Structure** (verified):
- Plain text Markdown with code blocks
- Sections separated by `--------------------------------`
- Each snippet includes source URL and description

### Endpoint 3: Pagination

- **Decision**: Context7 API does not appear to support pagination parameters for search
- **Rationale**: No `page`, `offset`, or `cursor` parameters observed in API responses
- **Impact**: FR-019 (infinite scroll) may need to be descoped or implemented client-side from initial result set

## Authentication Research

- **Decision**: Use `Authorization: Bearer {apiKey}` header when API Key is configured
- **Rationale**: Standard Bearer token pattern, optional for anonymous access
- **Verification**: Anonymous requests work without header; authenticated requests need testing with real key

## Raycast API Research

### useFetch Hook (from @raycast/utils)

- **Decision**: Use `useFetch` with `execute: false` pattern for search-on-type
- **Rationale**: Built-in loading states, error handling, and revalidation
- **Alternative considered**: Manual fetch with useState - more boilerplate, no auto-retry

### Debounce Implementation

- **Decision**: Use `useFetch` with manual trigger controlled by debounced search text
- **Rationale**: @raycast/utils doesn't have built-in debounce; use `setTimeout`/`clearTimeout` pattern
- **Alternative considered**: lodash.debounce - adds unnecessary dependency

### Preferences API

- **Decision**: Define `apiKey` preference in `package.json` with type `password`
- **Rationale**: Raycast encrypts password-type preferences on disk
- **Access pattern**: `getPreferenceValues<Preferences>().apiKey`

## Error Handling Research

| HTTP Status | User Message | Action |
|-------------|-------------|--------|
| 401 | "Invalid API Key. Please check your configuration." | Show toast, link to preferences |
| 404 | "Library not found." | Show empty state |
| 429 | "Rate limit exceeded. Configure an API Key for higher limits." | Show toast, link to preferences |
| Network Error | "Network error. Please check your connection." | Show toast with retry option |

## Open Questions (Resolved)

1. **Q**: Does Context7 support pagination? **A**: No pagination params observed. Will implement with initial batch only.
2. **Q**: What's the rate limit for anonymous users? **A**: Not documented; will handle 429 gracefully.
3. **Q**: Is there a library detail endpoint beyond docs? **A**: No; use search result metadata + docs endpoint.


# API Contract: Context7 REST API Integration

**Feature**: 001-raycast-context7-docs  
**Date**: 2025-12-18

## Base Configuration

```typescript
const BASE_URL = "https://context7.com/api/v2";
```

## Endpoints

### 1. Search Libraries

Search for libraries by keyword.

**Request**

```http
GET /search?query={keyword}
Authorization: Bearer {apiKey}  # Optional
```

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| query | string | Yes | Search keyword (URL encoded) |

**Response**

```typescript
// HTTP 200 OK
interface SearchResponse {
  results: Array<{
    id: string;           // e.g., "/marmelab/react-admin"
    title: string;        // e.g., "React-admin"
    description: string;  // Library description
    branch: string;       // e.g., "master"
    lastUpdateDate: string; // ISO 8601
    state: string;        // e.g., "finalized"
    totalTokens: number;
    totalSnippets: number;
    stars: number;        // -1 if not from GitHub
    trustScore: number;   // 0-10
    benchmarkScore: number;
    versions: string[];
  }>;
}
```

**Error Responses**

| Status | Description | Body |
|--------|-------------|------|
| 401 | Invalid API Key | `{ "error": "Unauthorized" }` |
| 429 | Rate Limit Exceeded | `{ "error": "Too Many Requests" }` |
| 500 | Server Error | `{ "error": "Internal Server Error" }` |

---

### 2. Get Library Documentation

Fetch documentation content for a specific library.

**Request**

```http
GET /docs/code/{owner}/{repo}?type=txt
Authorization: Bearer {apiKey}  # Optional
```

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| owner | string (path) | Yes | Repository owner or "websites" |
| repo | string (path) | Yes | Repository name or domain |
| type | string (query) | Yes | Must be "txt" for Markdown |

**Response**

```typescript
// HTTP 200 OK
// Content-Type: text/plain

// Plain text Markdown format:
// ### Snippet Title
// 
// Source: https://github.com/...
//
// Description text
//
// ```language
// code
// ```
//
// --------------------------------
//
// [Next snippet...]
```

**Error Responses**

| Status | Description | Body |
|--------|-------------|------|
| 401 | Invalid API Key | `{ "error": "Unauthorized" }` |
| 404 | Library Not Found | `{ "error": "Not Found" }` |
| 429 | Rate Limit Exceeded | `{ "error": "Too Many Requests" }` |

---

## TypeScript Client Interface

```typescript
interface Context7Client {
  /**
   * Search for libraries by keyword
   * @param query - Search term
   * @returns Promise resolving to search results
   * @throws APIError on failure
   */
  search(query: string): Promise<SearchResponse>;

  /**
   * Get documentation for a library
   * @param libraryId - Library ID from search result (e.g., "/owner/repo")
   * @returns Promise resolving to Markdown content
   * @throws APIError on failure
   */
  getDocs(libraryId: string): Promise<string>;
}
```

## Header Construction

```typescript
function buildHeaders(apiKey?: string): HeadersInit {
  const headers: HeadersInit = {
    "Accept": "application/json",
  };
  
  if (apiKey) {
    headers["Authorization"] = `Bearer ${apiKey}`;
  }
  
  return headers;
}
```

## URL Construction

```typescript
function buildSearchUrl(query: string): string {
  return `${BASE_URL}/search?query=${encodeURIComponent(query)}`;
}

function buildDocsUrl(libraryId: string): string {
  // libraryId format: "/owner/repo" or "/websites/domain"
  // Remove leading slash for path construction
  const path = libraryId.startsWith("/") ? libraryId.slice(1) : libraryId;
  return `${BASE_URL}/docs/code/${path}?type=txt`;
}
```

## Rate Limiting

| Access Type | Expected Limit | Notes |
|-------------|---------------|-------|
| Anonymous | Unknown (undocumented) | Handle 429 gracefully |
| Authenticated | Higher (per API Key tier) | Display in preferences hint |

## Security Considerations

1. API Key is stored encrypted by Raycast (password preference type)
2. API Key is never logged (even in development mode)
3. Only search queries are sent to Context7 servers
4. All connections use HTTPS


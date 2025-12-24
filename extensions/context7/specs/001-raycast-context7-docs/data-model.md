# Data Model: Raycast Context7 Extension

**Feature**: 001-raycast-context7-docs  
**Date**: 2025-12-18

## Entity Definitions

### 1. LibrarySearchResult

Represents a library returned from Context7's search API.

```typescript
interface LibrarySearchResult {
  /** Unique identifier in format "/{owner}/{repo}" or "/websites/{domain}" */
  id: string;
  
  /** Display name of the library */
  title: string;
  
  /** Brief description of the library's purpose */
  description: string;
  
  /** Git branch for documentation source */
  branch: string;
  
  /** ISO 8601 timestamp of last documentation update */
  lastUpdateDate: string;
  
  /** Documentation processing state (e.g., "finalized") */
  state: string;
  
  /** Total tokens in documentation */
  totalTokens: number;
  
  /** Number of code snippets indexed */
  totalSnippets: number;
  
  /** GitHub stars count (-1 if not from GitHub) */
  stars: number;
  
  /** Context7 trust score (0-10 scale) */
  trustScore: number;
  
  /** Context7 benchmark score for documentation quality */
  benchmarkScore: number;
  
  /** Available version tags */
  versions: string[];
}
```

**Source**: Search API response `results` array

### 2. SearchResponse

Wrapper for search API response.

```typescript
interface SearchResponse {
  results: LibrarySearchResult[];
}
```

### 3. LibraryDocumentation

Represents the documentation content for a library.

```typescript
interface LibraryDocumentation {
  /** Raw Markdown content from Context7 */
  content: string;
  
  /** Library metadata (from search result) */
  library: LibrarySearchResult;
}
```

**Note**: Documentation endpoint returns plain text, not JSON. The `library` field is passed from the search result for context.

### 4. Preferences

User-configurable settings stored by Raycast.

```typescript
interface Preferences {
  /** Optional Context7 API Key for higher rate limits */
  apiKey?: string;
}
```

**Storage**: Raycast encrypted preferences (password type)

### 5. APIError

Standardized error structure for API failures.

```typescript
interface APIError {
  /** HTTP status code or -1 for network errors */
  status: number;
  
  /** User-friendly error message */
  message: string;
  
  /** Whether user should be directed to preferences */
  showPreferencesLink: boolean;
}
```

## State Management

### Search State Flow

```
[Empty Query] → [No API Call] → [Show Placeholder]
     ↓
[User Types] → [300ms Debounce] → [API Call] → [Loading State]
     ↓
[Response] → [Display Results] or [Display Error]
```

### Detail View State Flow

```
[User Selects Library] → [Push Detail View] → [Fetch Docs]
     ↓
[Loading] → [Display Markdown] or [Display Error]
```

## Validation Rules

| Field | Rule | Error Message |
|-------|------|---------------|
| Search Query | Non-empty after trim | Show placeholder instead |
| API Key | Valid format if provided | "Invalid API Key format" |
| Library ID | Must contain "/" | Internal error (shouldn't reach user) |

## Relationships

```
Preferences (1) ←── uses ──→ (N) API Requests
     │
     └── apiKey → Authorization Header

LibrarySearchResult (1) ←── fetches ──→ (1) LibraryDocumentation
     │
     └── id → /api/v2/docs/code/{owner}/{repo}
```


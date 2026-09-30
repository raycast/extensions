# DevContainer Features Extension - Architecture

## Overview

This Raycast extension allows users to search and browse DevContainer features from the official registry. It fetches feature definitions from GHCR (GitHub Container Registry) and displays them with their documentation and configuration options.

## Directory Structure

```
src/
├── api/                 # External API integration
│   ├── cache.ts         # Cache management with TTL and validation
│   ├── collection-index.ts  # DevContainer collection index parsing
│   ├── ghcr.ts          # GHCR registry API (tokens, manifests, blobs)
│   └── github.ts        # GitHub API with rate limiting
├── components/          # React UI components
│   ├── FeatureActions.tsx   # Action panel for features
│   └── FeatureDetail.tsx    # Feature detail view
├── hooks/               # Custom React hooks
│   ├── useFavorites.ts      # Favorites management
│   ├── useFeatureContent.ts # README and script fetching
│   ├── useFeatureFilters.ts # Feature filtering logic
│   └── useFeatures.ts       # Main feature loading hook
├── utils/               # Utility functions
│   ├── collection.ts    # Collection/feature helpers with validation
│   ├── config.ts        # Configuration generation
│   ├── errors.ts        # Centralized error handling
│   ├── logger.ts        # Debug logging
│   ├── markdown.ts      # Markdown processing
│   ├── preferences.ts   # User preferences
│   └── throttle.ts      # Throttle/debounce utilities
├── __mocks__/           # Test mocks
│   └── raycast-api.ts   # Raycast API mock
├── types.ts             # TypeScript interfaces
└── search-features.tsx  # Main command entry point
```

## Key Design Patterns

### Error Handling

All errors are converted to `AppError` objects with:

- `code`: Typed error code (NETWORK_ERROR, RATE_LIMIT_EXCEEDED, etc.)
- `message`: Technical error message
- `userMessage`: User-friendly message
- `retryable`: Whether the operation can be retried
- `httpStatus`: Optional HTTP status code

```typescript
// Creating errors
const error = createHttpError(404, 'Resource not found');

// Converting errors
const appError = toAppError(unknownError);

// Getting user message
const message = getUserErrorMessage(error);
```

### Cache Validation

All cached data is validated before use:

- Schema validation ensures data structure integrity
- TTL-based expiration
- Automatic corruption recovery

### Input Validation

All public functions validate their inputs:

- `null`/`undefined` checks
- Type guards for complex objects
- Empty string handling

## Data Flow

1. **Collection Index** → Fetched from GitHub Pages
2. **Collections** → Parsed and filtered for features
3. **Features** → Fetched from GHCR manifests
4. **Content** → README and scripts fetched from GitHub

```
Collection Index (YAML)
        ↓
   Parse & Filter
        ↓
 Fetch GHCR Tokens
        ↓
 Fetch Manifests
        ↓
 Parse Blobs
        ↓
Display Features
```

## Testing

Tests use Vitest and cover:

- Utility functions (errors, collection, config, throttle, markdown)
- Cache operations with validation
- Error classification and handling

Run tests:

```bash
pnpm test        # Run once
pnpm test:watch  # Watch mode
```

## Error Codes

| Code                | HTTP Status | Retryable | Description           |
| ------------------- | ----------- | --------- | --------------------- |
| NETWORK_ERROR       | -           | Yes       | Connection failed     |
| RATE_LIMIT_EXCEEDED | 429         | No        | API rate limit hit    |
| UNAUTHORIZED        | 401         | No        | Authentication failed |
| FORBIDDEN           | 403         | No        | Access denied         |
| NOT_FOUND           | 404         | No        | Resource not found    |
| TIMEOUT             | 408         | Yes       | Request timeout       |
| SERVER_ERROR        | 5xx         | Yes       | Server error          |
| INVALID_RESPONSE    | -           | Yes       | Unexpected data       |
| CACHE_CORRUPTION    | -           | Yes       | Cache data invalid    |
| UNKNOWN             | -           | Yes       | Unexpected error      |

## Preferences

| Name          | Type     | Description                          |
| ------------- | -------- | ------------------------------------ |
| githubToken   | password | GitHub PAT for higher rate limits    |
| cacheTtlHours | dropdown | Cache duration (1, 6, 24, 168 hours) |
| concurrency   | dropdown | Parallel API requests (5, 10, 20)    |

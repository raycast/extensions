# Quickstart: Context7 Raycast Extension Development

**Feature**: 001-raycast-context7-docs  
**Date**: 2025-12-18

## Prerequisites

- Node.js 18+ (Raycast requirement)
- pnpm (project uses pnpm)
- Raycast installed on macOS/Windows

## Setup

```bash
# Clone and enter project
cd /Users/zhouyang/Coding/raycast-scripts/context7

# Install dependencies
pnpm install

# Start development mode
pnpm dev
# or
ray develop
```

## Project Structure

```
src/
├── search-context7-docs.tsx    # Main List command
├── components/
│   └── DocDetailView.tsx       # Detail view for docs
├── lib/
│   ├── api.ts                  # Context7 API client
│   └── types.ts                # TypeScript interfaces
└── hooks/
    └── useContext7Search.ts    # Search hook with debounce
```

## Key Implementation Files

### 1. API Client (`src/lib/api.ts`)

Lightweight fetch wrapper for Context7 API:

```typescript
// Core functions to implement:
// - search(query: string): Promise<SearchResponse>
// - getDocs(libraryId: string): Promise<string>
// - Error handling for 401, 404, 429
```

### 2. Types (`src/lib/types.ts`)

```typescript
// See data-model.md for full interface definitions
export interface LibrarySearchResult { ... }
export interface SearchResponse { ... }
export interface Preferences { ... }
```

### 3. Search Hook (`src/hooks/useContext7Search.ts`)

```typescript
// Combines:
// - Debounced search text (300ms)
// - useFetch from @raycast/utils
// - Preference reading for API Key
```

### 4. Main Command (`src/search-context7-docs.tsx`)

```typescript
// Renders:
// - List view with search bar
// - Library items with metadata
// - Detail push action on selection
```

### 5. Detail View (`src/components/DocDetailView.tsx`)

```typescript
// Renders:
// - Markdown documentation
// - Copy Content action
// - Open in Browser action
```

## Package.json Preferences

Add to `package.json`:

```json
{
  "preferences": [
    {
      "name": "apiKey",
      "type": "password",
      "required": false,
      "title": "Context7 API Key",
      "description": "Optional. Enter your API key to increase rate limits. Leave empty for anonymous access.",
      "placeholder": "ctx7sk..."
    }
  ]
}
```

## Testing Checklist

### Anonymous Access Test
1. Clear preferences: Raycast → Extensions → Context7 → Clear Preferences
2. Search for "react" → Should return results
3. View documentation → Should render Markdown

### API Key Test
1. Set fake key: `ctx7sk_fake` in preferences
2. Search for anything → Should show "Invalid API Key" error toast
3. Verify toast links to preferences

### Error Handling Tests
1. Search with no results: "asdfghjklqwerty" → "No results found"
2. Disconnect network → "Network error" toast
3. (Simulated) 429 response → Rate limit message with preferences link

### Markdown Rendering Test
1. Search for "react-admin" (complex docs)
2. View documentation
3. Verify code blocks render with syntax highlighting
4. Verify no broken formatting

## Development Tips

### Debug Logging

```typescript
import { environment } from "@raycast/api";

if (environment.isDevelopment) {
  console.log("API Response:", response);
}
```

### Toast Feedback

```typescript
import { showToast, Toast } from "@raycast/api";

// Success
await showToast({ style: Toast.Style.Success, title: "Copied!" });

// Error
await showToast({
  style: Toast.Style.Failure,
  title: "Error",
  message: "Rate limit exceeded",
  primaryAction: {
    title: "Open Preferences",
    onAction: () => openExtensionPreferences(),
  },
});
```

### Open Preferences Action

```typescript
import { openExtensionPreferences } from "@raycast/api";

// Use in error toast or action panel
await openExtensionPreferences();
```

## Build & Publish

```bash
# Lint check
pnpm lint

# Build for production
pnpm build

# Publish to Raycast Store
pnpm publish
```


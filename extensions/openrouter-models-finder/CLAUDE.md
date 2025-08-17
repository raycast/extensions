# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Common Development Commands

```bash
npm install         # Install dependencies
npm run dev        # Start Raycast extension development server
npm run build      # Build extension for production
npm run lint       # Run ESLint checks
npm run fix-lint   # Auto-fix linting issues
npm run publish    # Publish extension to Raycast store
```

## Project Architecture

This is a Raycast extension that searches and displays AI models from OpenRouter's API.

### Core Components

**API Layer (`src/api.ts`)**
- Fetches model data from `https://openrouter.ai/api/v1/models`
- No authentication required for public API endpoint
- **Caching system**: Uses Raycast Cache API with 1-hour TTL
  - `getCachedModels()`: Returns cached data if valid
  - `setCachedModels()`: Updates cache after successful fetch
  - Background refresh: Loads cached data immediately, then updates silently
- Token formatting logic: intelligently displays as B (billion), M (million), or K (thousand) tokens
- Price formatting: converts to per-million token pricing
- Error handling: Specific messages for timeout, network, rate limit, and service unavailable errors

**UI Layer (`src/find-models.tsx`)**
- Single command entry point: `find-models`
- Real-time filtering on both model ID and model name fields
- Sorting: newest models first (by `created` timestamp)
- **Loading strategy**:
  - Instant display of cached data on startup (zero delay)
  - Background update keeps data fresh
  - Graceful fallback to cache on network errors
- Actions per model:
  1. Copy Model ID (default action on Enter)
  2. Copy Model Name
  3. View on OpenRouter (opens browser)
  4. Refresh Models (Cmd+R) - forces data refresh

### Data Flow

1. **On mount**: 
   - Immediately displays cached models if available
   - Performs background fetch to update data
2. **Search**: User types → filters models by ID or name (case-insensitive)
3. **Sorting**: Results sorted by creation date (newest first)
4. **Actions**: User selects → copies to clipboard or opens browser
5. **Manual refresh**: Cmd+R forces immediate data refresh with loading state

### Raycast Extension Configuration

- **Command name**: `find-models` (must match filename in src/)
- **Icon**: `icon.png` in root directory
- **Version**: Follows semantic versioning in package.json
- **CHANGELOG.md**: Uses `{PR_MERGE_DATE}` placeholder for automatic date replacement

### Known Raycast Linting Warnings

- Title Case warning for "OpenRouter" should be ignored (it's a proper noun, not a title case issue)
- Action titles "Copy Model Id" and "View on Openrouter" may trigger Title Case warnings
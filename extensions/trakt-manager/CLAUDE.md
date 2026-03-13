# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Purpose

Trakt Manager is a Raycast extension that enables users to control their Trakt account directly from Raycast. Trakt is a platform for tracking movies and TV shows you watch. The extension provides commands to:
- Search movies, shows, and episodes
- Manage watchlists (add/remove items)
- View watch history
- Get personalized recommendations  
- Track "Up Next" episodes for shows in progress
- Mark content as watched
- Navigate to Trakt/IMDb pages

## Development Commands

- `npm run dev` - Start development server for Raycast extension
- `npm run build` - Build extension for distribution
- `npm run check` - TypeScript type checking (no emit)
- `npm run lint` - Lint code using Raycast's ESLint config
- `npm run fix-lint` - Auto-fix linting issues
- `npm run fmt` - Format code and organize imports using Prettier and syncpack

## Architecture Overview

### Core Architecture
- **API Client**: Uses `@ts-rest/core` for type-safe API interactions with Trakt API
- **Authentication**: OAuth 2.0 PKCE flow via `@raycast/utils` OAuthService
- **State Management**: React hooks with `useCachedPromise` for data fetching and caching
- **UI Components**: Raycast-specific components (Grid, ActionPanel, etc.)
- **Schema Validation**: Comprehensive Zod schemas for all API interactions

### Key Directories
- `src/lib/` - Core business logic and API layer
  - `client.ts` - Trakt API client initialization with auth headers
  - `contract.ts` - ts-rest API contract definitions for all Trakt endpoints
  - `oauth.ts` - OAuth provider configuration for Trakt authentication
  - `schema.ts` - Zod schemas for API request/response validation
  - `helper.ts` - Utility functions for URL generation, image handling, file caching
  - `constants.ts` - API URLs and configuration constants

- `src/components/` - Reusable UI components
  - `generic-grid.tsx` - Generic grid component using TypeScript generics
  - `episode-grid.tsx` - Episode-specific grid layout
  - `season-grid.tsx` - Season-specific grid layout

- `src/tools/` - Isolated tool functions for specific operations
  - `movies.ts`, `shows.ts`, `up-next.ts` - Standalone command implementations

### Coding Patterns & Conventions

**Data Fetching Pattern:**
```typescript
const { isLoading, data, pagination } = useCachedPromise(
  (searchText: string) => async (options: PaginationOptions) => {
    // Always include setTimeout for throttling
    await setTimeout(100-200);
    
    // Create AbortController for request cancellation
    abortable.current = new AbortController();
    setMaxListeners(APP_MAX_LISTENERS, abortable.current?.signal);
    
    // Make API call with signal
    const response = await traktClient.endpoint({
      query: { ...params },
      fetchOptions: { signal: abortable.current.signal }
    });
    
    // Handle response and pagination
    if (response.status !== 200) return { data: [], hasMore: false };
    const paginatedResponse = withPagination(response);
    return { data: paginatedResponse.data, hasMore: /* pagination logic */ };
  },
  [dependencies],
  {
    initialData: undefined,
    keepPreviousData: true,
    abortable,
    onError(error) {
      showToast({ title: error.message, style: Toast.Style.Failure });
    }
  }
);
```

**Action Callback Pattern:**
```typescript
const actionCallback = useCallback(async (item: ItemType) => {
  setActionLoading(true);
  try {
    await traktClient.endpoint({
      body: { items: [{ ids: { trakt: item.ids.trakt } }] },
      fetchOptions: { signal: abortable.current?.signal }
    });
    await revalidate();
    showToast({ title: "Success message", style: Toast.Style.Success });
  } catch (error) {
    showToast({ title: error.message, style: Toast.Style.Failure });
  } finally {
    setActionLoading(false);
  }
}, [revalidate]);
```

**Generic Component Pattern:**
- Use TypeScript generics for reusable components (`<T,>`)
- Pass functions for rendering (title, subtitle, poster, actions)
- Consistent prop interfaces across similar components

**Error Handling:**
- Toast notifications for all user-facing errors
- AbortController for request cancellation
- Graceful fallbacks for missing data (empty arrays, fallback images)
- Status code checking before processing responses

**File Caching:**
- Custom file cache utilities in `helper.ts` for persistent storage
- Uses Raycast's `environment.supportPath` for file storage

**URL Generation:**
- Centralized helper functions for Trakt and IMDb URLs
- Consistent slug-based routing patterns

### API Integration Patterns
- All API calls go through the centralized `initTraktClient()` function
- Authentication handled automatically via OAuth provider  
- Pagination managed by `withPagination` utility wrapper
- Comprehensive Zod schema validation for all requests/responses
- Consistent query parameter patterns (page, limit, extended, sorting)
- AbortController usage for request cancellation
- Extended metadata fetching with `extended: "full,cloud9"` for images

### Command Structure
Each main file (`movies.tsx`, `shows.tsx`, etc.) represents a Raycast command with:
- Search functionality with debounced input and pagination
- Grid-based UI with poster images from Trakt's cloud9 CDN
- Context actions (add to watchlist, mark as watched, open in browser)
- Consistent action loading states and error handling
- Media type switching (movies vs shows) where applicable

### Key Dependencies
- `@raycast/api` - Core Raycast extension APIs
- `@raycast/utils` - Utility hooks (useCachedPromise, OAuth)
- `@ts-rest/core` - Type-safe API client with contract-first approach
- `zod` - Runtime schema validation for all API data
- `node-fetch` - HTTP client for API requests

### Authentication Flow
Uses OAuth 2.0 PKCE with Trakt's API. The `AuthProvider` automatically handles token management, refresh, and injection into API requests. No manual token handling required.

## Advanced Patterns & Techniques

### Type Safety Architecture
- **Zod + ts-rest Integration**: Comprehensive runtime validation with compile-time safety
  - Schemas in `schema.ts` define data shapes using Zod's fluent API
  - Composed schemas (e.g., `TraktPaginationWithSortingSchema = TraktPaginationSchema.merge(TraktSortingSchema)`)
  - Type inference from Zod schemas (e.g., `export type TraktMovieListItem = z.infer<typeof TraktMovieListItem>`)
  - Contract-driven API development ensures end-to-end type safety

- **Generic Component Design**: `GenericGrid<T>` uses TypeScript generics for reusable, type-safe UI components
  - Props typed as functions: `title: (item: T) => string`, `actions: (item: T) => Grid.Item.Props["actions"]`
  - Allows rendering different data types (movies, shows, episodes) with same component

### Performance Optimizations
- **Request Management**:
  - AbortController pattern for cancelling requests on search changes
  - `setMaxListeners(APP_MAX_LISTENERS, abortable.current?.signal)` prevents event listener warnings
  - `setTimeout(100-200)` for throttling API requests
  - `AbortSignal.timeout(3600)` in tools for request timeouts

- **Caching Strategy**:
  - `useCachedPromise` with `keepPreviousData: true` for seamless UX during pagination
  - Custom file caching in `helper.ts` using Raycast's `environment.supportPath`
  - `initialData: undefined` pattern for consistent loading states

- **UI Optimizations**:
  - `throttle={true}` on search-enabled grids for debounced input
  - `useCallback` for memoized action handlers preventing unnecessary re-renders
  - Fallback images (`poster.png`, `episode.png`) for graceful UI degradation

### State Management Patterns
- **Local State Architecture**: No global state management - all state local to commands
- **Revalidation Pattern**: `revalidate()` functions from `useCachedPromise` for cache invalidation after mutations
- **Loading State Management**: `actionLoading` state with try/finally blocks for UI feedback
- **Media Type Switching**: Conditional rendering based on `TraktMediaType` enum (`"movie" | "show"`)

### Error Handling Strategy
- **Centralized Toast Notifications**: All errors surface via `showToast({ style: Toast.Style.Failure })`
- **Graceful API Failures**: Status code checking with fallback to empty data arrays
- **Request Cancellation**: AbortController integration prevents race conditions
- **No Global Error Boundaries**: Per-command error handling keeps complexity low

### Special Raycast Integrations
- **Command Configuration**: Each command defined in `package.json` with metadata (icons, categories)
- **Keyboard Shortcuts**: Consistent shortcut patterns using `Keyboard.Shortcut.Common.*`
- **Icons & Favicons**: Strategic use of `getFavicon()` for external links and `Icon.*` for actions
- **OAuth Integration**: Seamless authentication via `@raycast/utils` OAuthService

### URL Generation & Deep Linking
- **Centralized URL Helpers**: `getTraktUrl()` and `getIMDbUrl()` for consistent deep linking
- **Slug-based Routing**: URL patterns match Trakt's routing structure
- **External App Integration**: Deep links to IMDb and Trakt web/apps

### Development Workflow
- **No Testing Framework**: Codebase has no test files or testing configuration
- **Linting & Formatting**: 
  - ESLint with `@raycast/eslint-config`
  - Prettier with `prettier-plugin-organize-imports`
  - Syncpack for dependency management consistency
- **Type Checking**: `tsc --noEmit` for compile-time validation without output

### API Integration Best Practices
- **Pagination Handling**: `withPagination<T>` utility extracts pagination metadata from headers
- **Consistent Query Patterns**: Standard parameters (page, limit, extended, sorting)
- **Extended Metadata**: `extended: "full,cloud9"` for rich data including images
- **Request Headers**: Trakt-specific headers (`trakt-api-version`, `trakt-api-key`)

### Component Architecture
- **Functional Composition**: Components accept function props for flexible rendering
- **Consistent Action Patterns**: All grids support common actions (open in browser, add to watchlist, etc.)
- **Reusable Grid System**: Three grid variants (generic, episode, season) with shared patterns
- **ActionPanel Structure**: Consistent action organization with keyboard shortcuts

### Notable Conventions
- **File Naming**: Command files match package.json command names exactly
- **Import Organization**: External libs first, then local imports in dependency order
- **Async/Await Preference**: Consistent async patterns over Promise chains
- **Early Returns**: Guard clauses for edge cases (empty search, invalid responses)

This architecture prioritizes developer experience through type safety, performance through strategic caching and request management, and user experience through responsive UI patterns and error handling.
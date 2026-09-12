# CLAUDE.md

Trakt Manager — Raycast extension for managing your Trakt (movie/TV tracking) account.

## Commands

- `npm run dev` — start dev server
- `npm run build` — build for distribution
- `npm run check` — TypeScript type checking (`tsc --noEmit`)
- `npm run lint` — ESLint
- `npm run fix-lint` — auto-fix lint
- `npm run fmt` — Prettier + organize imports + syncpack

## Architecture

- **API**: `@ts-rest/core` contract-driven client with Zod schema validation (`src/lib/contract.ts`, `src/lib/schema.ts`)
- **Auth**: OAuth 2.0 PKCE via `@raycast/api` (`src/lib/oauth.ts`)
- **Data fetching**: `useCachedPromise` from `@raycast/utils` with AbortController for cancellation
- **UI**: Raycast Grid/ActionPanel components, generic grid system (`src/components/generic-grid.tsx`)
- **No test framework** — `npm run check` is the primary automated gate

## Key patterns

- Each `.tsx` in `src/` is a Raycast command (matches `package.json` commands)
- `useCachedPromise` wraps all async data fetching with pagination, caching, and abort support
- Action callbacks use `useCallback` with `try/catch/finally` for loading states and toast errors
- Zod schemas compose via `.merge()` and `.extend()` — types inferred with `z.infer<typeof Schema>`
- `withPagination<T>` extracts pagination metadata from response headers
- File caching uses `environment.supportPath` for persistent storage

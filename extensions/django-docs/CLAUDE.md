# Django Docs Raycast Extension

## Commands
```bash
npm run dev        # Hot reload development
npm run build      # Production build
npm run lint       # ESLint checks
npm test           # Run Jest tests
npm run test:watch # Watch mode
```

## Project Structure
```
src/
├── commands/           # Raycast command entry points
│   ├── search-documentation.tsx  # Main search UI (view mode)
│   └── refresh-docs.tsx          # Background refresh (no-view mode)
├── components/         # React components
├── services/           # Data fetching (sitemap, django-docs, cache)
└── types/              # TypeScript interfaces
```

## Key Patterns

### Strings
- Use single quotes for strings

### View vs No-View Commands
- **View commands** (`search-documentation.tsx`): React components with hooks
- **No-view commands** (`refresh-docs.tsx`): Async functions, no React hooks allowed

### Data Fetching
Use `useCachedPromise` from `@raycast/utils` for cached data fetching in view commands:
```typescript
const { data, isLoading } = useCachedPromise(loadData, [args], {
  onError: (error) => showToast({ style: Toast.Style.Failure, title: "Error" }),
});
```

For services and no-view commands, use native `fetch()`.

### Circular Reference Serialization
`DocEntry` objects have circular references (parent/previous/next). For caching:
1. Serialize to URL strings before caching
2. Deserialize and reconstruct references after retrieval
See `serializeEntries()` and `deserializeEntries()` in `search-documentation.tsx`.

### Loading States
Always render immediately with `isLoading`:
```typescript
return <List isLoading={isLoading}>...</List>;
```

### Error Handling
Show toasts for errors, don't throw. Fallback to cache when available.

## Testing
- Tests use `@testing-library/react` with Jest
- Mock `@raycast/api` components via `jest.setup.js`
- Mock `@raycast/utils` hooks in test files
- Mock `fetch` globally: `global.fetch = jest.fn()`

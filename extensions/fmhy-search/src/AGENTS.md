# AGENTS.md

## Scope

This folder contains Raycast command entry points.

## Files

- `search-fmhy.tsx`: View command that loads cached FMHY index data, renders grouped searchable results, shows index status, and exposes resource, category, category-note, quick-link, and related-link actions.
- `lib/`: Shared code used by both commands.

## React Patterns

### State Management

- **IndexState**: `{ index, isLoading, timestamp, error, isStale, isLegacyCache }` tracks the full app state. `index` is `{ results, categories }`.
- **searchText state**: Separate from index state to avoid expensive re-renders during typing.
- **visibleResultLimit**: Tracks pagination; incremented when user requests more results.
- **selectionTargetId**: One-shot list selection target used after "Load More Results"; keep normal arrow-key navigation uncontrolled so Raycast does not recenter the list on every selection change.
- **Category lookup**: Build a memoized `Map<string, FmhyCategory>` from `index.categories` and pass category metadata into grouped sections/actions.

### Performance Patterns

- **useMemo**: Search filtering is memoized to avoid O(n) recalculation on every keystroke.
- **useCallback**: Event handlers (`handleSearchTextChange`, `clearSelectionTarget`, `loadMoreResults`, `refreshIndex`) wrapped to prevent unnecessary re-renders.
- **isMounted flag**: Cleanup function in useEffect prevents state updates after component unmounts (memory leak prevention).

### Error Resilience

```
Try fetch:
  ✓ Success → Update state, cache, show success toast
  ✗ Has cached data → Use stale cache, show warning toast when manual refresh fails
  ✗ No cached data → Show error, empty state
```

### Pagination

- Results returned in chunks (100 per page by default).
- A "Load More Results" list item increments `visibleResultLimit`.
- After loading more, briefly select the first newly added result URL via `selectionTargetId`, then clear it so the list returns to native uncontrolled navigation.
- Lazy loading prevents rendering large lists upfront.

### Actions and Display

- The refresh action belongs in the `Search FMHY` command action panel with `Keyboard.Shortcut.Common.Refresh`; do not add a separate refresh command.
- Use category section titles for grouped results. Include note counts in section subtitles when category notes exist.
- Starred resources use a yellow star icon/accessory. Redirect rows use an arrow icon and should open the normalized `fmhy.net` target. Index rows use a globe icon.
- Quick related links for X/Twitter, Discord, GitHub, GitLab, Telegram, and Reddit stay directly in the action panel and use Simple Icons brand assets with Raycast icon fallbacks.
- Non-social related links are not listed directly in the main action menu. Show a compact link-count accessory on the result and open them through the pushed `RelatedLinksList` view.
- Category notes should be shown with a pushed `Detail` view rather than inline list text.
- Normalize category URLs with `normalizeFmhyGeneratedCategoryUrl()` before opening category links from the UI.

## Guidance

- Use Raycast APIs and React state patterns already present in this folder.
- Keep UI behavior native to Raycast components and move reusable parsing, fetching, cache, or formatting logic into `src/lib`.
- When adding new result actions, follow the pattern of creating an `ActionPanel` with primary action + menu items.
- Avoid fetching or heavy computation outside of `useEffect` to prevent memory leaks.
- Keep cache reads fast and render cached results immediately; refresh should be explicit unless no cache exists.
- Use `showToast` for user feedback on errors, cache updates, and long-running operations.

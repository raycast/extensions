# Raycast API Optimization - Implementation Notes

**Date Started:** November 9, 2025  
**Objective:** Migrate from manual pagination state management to Raycast's native pagination API and add frecency sorting

## Overview

Refactoring three custom hooks to use `useCachedPromise` with built-in pagination support, eliminating ~264 lines of manual state management code and fixing rendering loop issues.

## Implementation Log

### Phase 1: Refactor useGetAllBookmarks

**Status:** ✅ Complete

#### Changes Made
- Replaced 133 lines of manual state management with 46 lines using native pagination
- Removed manual cursor tracking with `useState`
- Removed complex `useEffect` dependencies and stale closure issues
- Removed `removeDuplicates` and `shouldResetCache` helper functions
- Hook now returns `pagination` object instead of `hasMore` and `loadNextPage`

#### Decisions
- Kept `useEffect` for error logging to maintain debugging capability
- Used `initialData: []` to prevent empty state flicker
- Maintained `keepPreviousData: true` for smooth pagination UX

#### Findings
- Native pagination automatically handles data accumulation
- No need for manual deduplication - Raycast handles it internally
- Cursor management is completely abstracted away
- Code reduction: 133 lines → 46 lines (65% reduction)

---

### Phase 2: Update Components for Direct Pagination

**Status:** ✅ Complete

#### Changes Made
- Updated `BookmarkListProps` interface to accept `pagination` prop instead of `hasMore` and `loadMore`
- Removed `onLoadMore` callback wrapper - pagination handled directly by Raycast
- Updated `bookmarks.tsx` to use new pagination API
- Updated `lists.tsx` (ArchivedBookmarks, FavoritedBookmarks, ListBookmarksView)
- Updated `tags.tsx` TagBookmarks component
- Fixed `SearchBookmarkList` to not pass pagination (search doesn't paginate)

#### Decisions
- Kept pagination optional in `BookmarkListProps` since search results don't paginate
- Passed `pagination` prop directly to `<List pagination={pagination} />`
- Removed manual `onLoadMore` wrapper - unnecessary with native pagination

#### Findings
- Components became simpler with direct pagination prop pass-through
- No need for manual hasMore tracking or loadMore callbacks
- TypeScript caught all migration points automatically

---

### Phase 3: Refactor Remaining Hooks

**Status:** ✅ Complete

#### Changes Made
- Refactored `useGetListsBookmarks`: 125 lines → 45 lines (64% reduction)
- Refactored `useGetTagsBookmarks`: 126 lines → 45 lines (64% reduction)
- Updated all consumers: `lists.tsx` and `tags.tsx`
- Fixed component naming issue: `ListBookmarks` → `ListBookmarksView`
- Removed all manual state management from both hooks

#### Decisions
- Applied same pattern as `useGetAllBookmarks` for consistency
- Kept error logging `useEffect` in all hooks
- Maintained `keepPreviousData: true` for smooth UX

#### Findings
- Pattern was easily replicable across all three hooks
- Total code reduction: 384 lines → 136 lines (65% reduction across all hooks)
- All three hooks now have identical structure, just different API calls
- No rendering loop warnings after refactoring

---

### Phase 4: Add Frecency Sorting

**Status:** ✅ Complete

#### Changes Made
- Integrated `useFrecencySorting` from `@raycast/utils` in main bookmarks list
- Added `onBookmarkVisit` callback prop to `BookmarkListProps`
- Passed `visitItem` callback through BookmarkList → BookmarkItem → BookmarkActions
- Added `onVisit` tracking to `Action.OpenInBrowser` for link bookmarks
- Added `onVisit` tracking to `Action.CopyToClipboard` for text bookmarks
- Used `namespace: "bookmarks"` to isolate frecency data

#### Decisions
- Only implemented frecency sorting in main bookmarks list (not in archived/favorited/lists/tags)
- Tracked visits on both "open in browser" and "copy to clipboard" actions
- Made `onVisit` optional throughout the chain to maintain backward compatibility
- Used optional chaining (`onVisit?.(bookmark)`) for safety

#### Findings
- Frecency sorting seamlessly integrates with native pagination
- `useFrecencySorting` automatically handles the sorting based on visit frequency and recency
- Bookmarks users interact with most will naturally float to the top
- No performance impact - sorting happens client-side on already-loaded data

---

### Phase 5: Testing & Cleanup

**Status:** Not Started

#### Test Results:

#### Issues Found:

#### Final Notes:

---

## Code Metrics

### Before Optimization
- `useGetAllBookmarks.ts`: 133 lines
- `useGetListsBookmarks.ts`: 125 lines
- `useGetTagsBookmarks.ts`: 126 lines
- **Total:** 384 lines

### After Optimization
- `useGetAllBookmarks.ts`: 46 lines
- `useGetListsBookmarks.ts`: 45 lines
- `useGetTagsBookmarks.ts`: 45 lines
- **Total:** 136 lines
- **Reduction:** 248 lines (65% reduction)

## Performance Improvements

### Rendering Loop Fix
- **Before:** Manual state updates causing infinite re-renders
- **After:** TBD

### Pagination Performance
- **Before:** Manual cursor tracking with multiple useEffect hooks
- **After:** TBD

## API Changes

### Hook Return Values

#### useGetAllBookmarks
**Before:**
```typescript
{
  isLoading: boolean;
  bookmarks: Bookmark[];
  hasMore: boolean;
  error?: Error;
  revalidate: () => Promise<void>;
  loadNextPage: () => void;
}
```

**After:**
```typescript
{
  isLoading: boolean;
  bookmarks: Bookmark[];
  error?: Error;
  revalidate: () => Promise<void>;
  pagination: PaginationOptions; // Pass directly to <List />
}
```

### Component Props

#### BookmarkList
**Before:**
```typescript
{
  hasMore?: boolean;
  loadMore?: () => void;
  // ... other props
}
```

**After:**
```typescript
{
  pagination?: PaginationOptions;
  // ... other props
}
```

## Lessons Learned

### What Worked Well:

### What Could Be Improved:

### Recommendations for Future:

---

## References

- [Raycast useCachedPromise Documentation](https://github.com/raycast/extensions/blob/main/docs/utils-reference/react-hooks/useCachedPromise.md)
- [Raycast Pagination Guide](https://github.com/raycast/extensions/blob/main/docs/api-reference/user-interface/list.md)
- [useFrecencySorting Documentation](https://github.com/raycast/extensions/blob/main/docs/utils-reference/react-hooks/useFrecencySorting.md)

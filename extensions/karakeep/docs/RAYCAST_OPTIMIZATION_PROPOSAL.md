# Raycast API Optimization Proposal

## Summary

The current implementation manually manages pagination state, which can be replaced with Raycast's built-in pagination support. This would:

- **Reduce code by ~70 lines per hook** (3 hooks = ~210 lines saved)
- **Eliminate the rendering loop bug** entirely (no manual state management)
- **Improve performance** with Raycast's optimized pagination
- **Simplify maintenance** with less custom logic

## Current Implementation Issues

### 1. Manual State Management

```typescript
// Current: 133 lines with complex state logic
const [state, setState] = useState<BookmarksState>({
  allBookmarks: [],
  isInitialLoad: boolean,
  cursor?: string,
});

// Manual cursor tracking
const loadNextPage = useCallback(() => {
  setState((prev) => ({ ...prev, cursor: data.nextCursor }));
}, [data, isLoading]);
```

### 2. Complex useEffect Logic

```typescript
// Multiple useEffects managing state updates
useEffect(() => {
  if (!data?.bookmarks) return;
  setState((prev) => {
    // Complex conditional logic for initial load, reset, pagination
    if (prev.isInitialLoad) { /* ... */ }
    if (!prev.cursor) { /* ... */ }
    if (prev.cursor) { /* ... */ }
    return prev;
  });
}, [data, removeDuplicates, shouldResetCache]);
```

### 3. Manual Deduplication

```typescript
const removeDuplicates = useCallback(
  (bookmarks: Bookmark[]) => Array.from(new Map(bookmarks.map((b) => [b.id, b])).values()),
  [],
);
```

## Proposed Implementation with Native Pagination

### Simplified Hook (40 lines vs 133 lines)

```typescript
import { useCachedPromise } from "@raycast/utils";
import { fetchGetAllBookmarks } from "../apis";
import { ApiResponse, Bookmark, GetBookmarksParams } from "../types";

export function useGetAllBookmarks({ favourited, archived }: GetBookmarksParams = {}) {
  const { isLoading, data, error, revalidate, pagination } = useCachedPromise(
    (favourited, archived) => async (options) => {
      const result = (await fetchGetAllBookmarks({
        cursor: options.cursor,
        favourited,
        archived,
      })) as ApiResponse<Bookmark>;

      return {
        data: result.bookmarks || [],
        hasMore: result.nextCursor !== null,
        cursor: result.nextCursor,
      };
    },
    [favourited, archived],
    {
      keepPreviousData: true,
      initialData: [],
    },
  );

  return {
    isLoading,
    bookmarks: data || [],
    error,
    revalidate,
    pagination, // Pass directly to <List pagination={pagination} />
  };
}
```

### Updated Component Usage

#### Option 1: Direct pagination prop (Recommended)

```typescript
export default function BookmarksList() {
  const { isLoading, bookmarks, error, revalidate, pagination } = useGetAllBookmarks();

  return (
    <BookmarkList
      bookmarks={bookmarks}
      isLoading={isLoading}
      onRefresh={revalidate}
      pagination={pagination} // Direct pass-through
    />
  );
}
```

#### Option 2: Keep backward compatibility

```typescript
// In the hook, add a compatibility wrapper:
return {
  isLoading,
  bookmarks: data || [],
  hasMore: pagination?.hasMore ?? false,
  error,
  revalidate,
  loadNextPage: () => {}, // No-op, pagination handles it
  pagination,
};
```

## Benefits

### 1. **Automatic Data Accumulation**

Raycast handles appending pages automatically - no manual array spreading or deduplication needed.

### 2. **Built-in Cursor Management**

The `pagination` object manages cursor state internally - no manual `useState` needed.

### 3. **Optimized Performance**

- No manual `useEffect` dependencies to track
- No risk of stale closures
- No rendering loops from state updates
- Raycast team's optimizations built-in

### 4. **Cleaner API**

```typescript
// Before: Complex interface
const { bookmarks, hasMore, loadNextPage } = useGetAllBookmarks();
<List pagination={{ onLoadMore: loadNextPage, hasMore }} />

// After: Simple pass-through
const { bookmarks, pagination } = useGetAllBookmarks();
<List pagination={pagination} />
```

## Additional Raycast Utilities to Consider

### 1. `useFrecencySorting` for Smart Sorting

```typescript
import { useFrecencySorting } from "@raycast/utils";

const { data: sortedBookmarks, visitItem } = useFrecencySorting(bookmarks);

// Track visits when user opens a bookmark
<Action.OpenInBrowser url={bookmark.url} onOpen={() => visitItem(bookmark)} />
```

**Benefits:**

- Bookmarks user accesses frequently appear first
- Considers both frequency AND recency
- Personalized experience per user

### 2. Already Using `useCachedState` ✅

Good choice for draft persistence in `createNote.tsx`.

## Migration Path

### Phase 1: Create Refactored Hooks (Low Risk)

1. Create `useGetAllBookmarks.v2.ts` with new implementation
2. Test in one component (e.g., `bookmarks.tsx`)
3. Verify pagination works correctly

### Phase 2: Update Components (Medium Risk)

1. Update `BookmarkList` to accept `pagination` prop
2. Remove `loadMore` and `hasMore` props (or keep for backward compat)
3. Update all hook consumers

### Phase 3: Apply to All Hooks (Low Risk)

1. Refactor `useGetListsBookmarks.ts`
2. Refactor `useGetTagsBookmarks.ts`
3. Remove old implementations

### Phase 4: Add Frecency Sorting (Optional)

1. Add `useFrecencySorting` to main bookmark list
2. Track visits on bookmark actions

## Code Reduction Summary

| File | Current Lines | Proposed Lines | Savings |
|------|--------------|----------------|---------|
| `useGetAllBookmarks.ts` | 133 | 40 | 93 lines |
| `useGetListsBookmarks.ts` | 125 | 40 | 85 lines |
| `useGetTagsBookmarks.ts` | 126 | 40 | 86 lines |
| **Total** | **384** | **120** | **264 lines** |

## Recommendation

**Implement the refactored version.** The benefits significantly outweigh the migration effort:

- ✅ Eliminates rendering loop bug
- ✅ Reduces code by 69%
- ✅ Leverages battle-tested Raycast utilities
- ✅ Easier to maintain and understand
- ✅ Better performance out of the box

The refactored version is already created in `useGetAllBookmarks.refactored.ts` for testing.

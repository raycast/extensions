# Performance Optimization Recommendations

## Root Cause Analysis

The memory exhaustion issue is caused by **eager image loading** in `useBookmarkImages`:

1. Every `BookmarkItem` loads screenshots immediately via `getScreenshot()`
2. Base64-encoded images are stored in component state
3. With pagination loading 30+ bookmarks, this means 30+ images in memory
4. As you scroll, more pages load = more images = memory exhaustion

## Recommended Solutions

### Option 1: Lazy Load Images (Recommended)
Only load images when the user actually views the bookmark detail, not in the list view.

**Changes needed:**
- Remove `useBookmarkImages` from `BookmarkItem` 
- Only call `getScreenshot()` in `BookmarkDetail` when user opens a bookmark
- Use placeholder icons in list view instead of screenshots
- Reduces memory by ~90% (no images loaded until needed)

**Implementation:**
```typescript
// In BookmarkItem.tsx - REMOVE useBookmarkImages
export function BookmarkItem({ bookmark, config, onRefresh, onCleanCache }: BookmarkItemProps) {
  const { t } = useTranslation();
  // const images = useBookmarkImages(initialBookmark); // REMOVE THIS
  
  // Use icon instead
  const getIcon = () => {
    switch (bookmark.content.type) {
      case "link":
        return Icon.Link;
      case "text":
        return Icon.Document;
      case "asset":
        return bookmark.content.assetType === "image" ? Icon.Image : Icon.Document;
      default:
        return Icon.Link;
    }
  };

  return (
    <List.Item
      id={bookmark.id}
      title={getDisplayTitle() || ""}
      icon={getIcon()} // Use icon instead of screenshot
      // Remove detail prop with screenshot
      actions={...}
    />
  );
}
```

### Option 2: Use URL-based Images Instead of Base64
Instead of loading base64 images, use direct URLs to let Raycast handle caching.

**Changes needed:**
```typescript
// Instead of:
const screenshot = await getScreenshot(screenshot.id); // Returns base64

// Use:
const screenshotUrl = `${config.apiUrl}/api/v1/assets/${screenshot.id}`;

// In List.Item:
<List.Item.Detail
  markdown={`![](${screenshotUrl})`}
/>
```

Benefits:
- Raycast handles image caching
- No base64 encoding overhead
- Images load on-demand
- Memory managed by Raycast

### Option 3: Implement Virtual Scrolling
Use Raycast's built-in pagination more conservatively.

**Changes needed:**
- Reduce page size from 30 to 10-15 items
- Add `execute: false` to prevent auto-loading
- Load next page only when user explicitly scrolls

```typescript
const { isLoading, data, pagination } = useCachedPromise(
  () => async (options) => {
    const result = await fetchGetAllBookmarks({ cursor: options.cursor });
    return {
      data: result.bookmarks || [],
      hasMore: result.nextCursor !== null,
      cursor: result.nextCursor,
    };
  },
  [],
  {
    initialData: [],
    execute: false, // Don't auto-load
    pageSize: 10, // Smaller pages
  },
);
```

### Option 4: Add Limit Parameter to API Calls
The Karakeep API likely supports a `limit` parameter for page size.

**Changes needed:**
```typescript
export async function fetchGetAllBookmarks({ cursor, favourited, archived, limit = 15 }: GetBookmarksParams) {
  const params = new URLSearchParams();
  if (cursor) params.append("cursor", cursor);
  if (favourited) params.append("favourited", favourited.toString());
  if (archived) params.append("archived", archived.toString());
  if (limit) params.append("limit", limit.toString()); // Add limit
  
  return fetchWithAuth(`/api/v1/bookmarks?${params.toString()}`);
}
```

## Recommended Implementation Order

1. **Immediate (Option 1)**: Remove image loading from list view
   - Fastest fix
   - Biggest impact
   - No API changes needed

2. **Short-term (Option 2)**: Switch to URL-based images
   - Better UX than no images
   - Let Raycast handle caching
   - Requires API URL construction

3. **Medium-term (Option 4)**: Add limit parameter
   - Control page size
   - Reduce data transfer
   - Better for large collections

4. **Long-term**: Consider server-side optimizations
   - Thumbnail generation
   - CDN for images
   - Compressed image formats

## Expected Results

After implementing Option 1:
- Memory usage: ~10-15MB (down from 80-90MB)
- No pagination memory errors
- Instant list rendering
- Images only load when viewing bookmark details

## Additional Optimizations

### Remove Unnecessary Data
```typescript
// In BookmarkItem, only pass what's needed
<BookmarkItem
  bookmark={{
    id: bookmark.id,
    title: bookmark.title,
    content: { type: bookmark.content.type, title: bookmark.content.title },
    // Don't pass assets, summary, note unless needed
  }}
/>
```

### Use React.memo for BookmarkItem
```typescript
export const BookmarkItem = React.memo(({ bookmark, config, onRefresh }: BookmarkItemProps) => {
  // Component implementation
}, (prevProps, nextProps) => {
  // Only re-render if bookmark ID changes
  return prevProps.bookmark.id === nextProps.bookmark.id;
});
```

### Debounce Search
```typescript
const debouncedSearch = useMemo(
  () => debounce((text: string) => {
    // Search logic
  }, 300),
  []
);
```

## Testing Checklist

After implementing fixes:
- [ ] Load extension with 1000+ bookmarks
- [ ] Paginate through multiple pages
- [ ] Check memory usage stays under 30MB
- [ ] Verify no "refusing to paginate" errors
- [ ] Test bookmark detail view still shows images
- [ ] Verify search performance
- [ ] Test refresh functionality

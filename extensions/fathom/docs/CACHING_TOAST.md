# Caching Progress Toast

## Overview

When the Search Meetings command loads for the first time with an empty cache, a progress toast displays the caching progress in real-time.

## Toast Behavior

### Initial Load (Empty Cache)

**1. Start Caching**
```
🔄 Caching 1 of 50 meetings
```

**2. Progress Updates**
```
🔄 Caching 2 of 50 meetings
🔄 Caching 3 of 50 meetings
...
🔄 Caching 50 of 50 meetings
```

**3. Success**
```
✅ Cached 50 meetings
   Full-text search now available
```

### Subsequent Loads (Cache Exists)

No toast is shown - meetings load instantly from cache.

### Error State

If caching fails:
```
❌ Failed to cache meetings
   [Error message]
```

## Implementation Details

### When Toast Shows
- **Condition**: Cache is empty AND meetings are being fetched
- **Trigger**: First time user opens Search Meetings
- **Frequency**: Only on initial cache population

### When Toast Doesn't Show
- Cache already has meetings (subsequent loads)
- No meetings returned from API
- Caching is disabled

### Toast Updates
- **Style**: `Toast.Style.Animated` during caching
- **Title**: Updates for each meeting cached
- **Final Style**: `Toast.Style.Success` on completion
- **Message**: "Full-text search now available"

### Progress Tracking
```typescript
// Show progress toast only if cache was empty
const shouldShowProgress = cachedMeetings.length === 0 && totalMeetings > 0;

// Update toast for each meeting
for (let i = 0; i < meetings.length; i++) {
  await cacheMeeting(...);
  
  if (progressToast) {
    progressToast.title = `Caching ${i + 1} of ${totalMeetings} meetings`;
  }
}

// Show success
progressToast.style = Toast.Style.Success;
progressToast.title = `Cached ${totalMeetings} meetings`;
progressToast.message = "Full-text search now available";
```

## User Experience

### First-Time User Flow

1. User opens "Search Meetings" command
2. Extension checks cache → empty
3. API fetches meetings with summaries/transcripts
4. Toast appears: "Caching 1 of 50 meetings"
5. Toast updates as each meeting is cached
6. Toast changes to success: "Cached 50 meetings"
7. User can now search with full-text

### Returning User Flow

1. User opens "Search Meetings" command
2. Extension checks cache → has data
3. Meetings load instantly (no toast)
4. User can search immediately

### Manual Refresh Flow

1. User clicks "Refresh Cache" action
2. Toast: "Refreshing meetings..."
3. API fetches new data
4. Caching happens (with progress if cache was cleared)
5. Toast: "Meetings refreshed"

## Visual Examples

### Progress Toast Sequence

```
Frame 1 (0s):
┌─────────────────────────────────┐
│ 🔄 Caching 1 of 50 meetings     │
└─────────────────────────────────┘

Frame 2 (0.1s):
┌─────────────────────────────────┐
│ 🔄 Caching 5 of 50 meetings     │
└─────────────────────────────────┘

Frame 3 (0.5s):
┌─────────────────────────────────┐
│ 🔄 Caching 25 of 50 meetings    │
└─────────────────────────────────┘

Frame 4 (1s):
┌─────────────────────────────────┐
│ 🔄 Caching 50 of 50 meetings    │
└─────────────────────────────────┘

Frame 5 (1.1s):
┌─────────────────────────────────┐
│ ✅ Cached 50 meetings            │
│    Full-text search now available│
└─────────────────────────────────┘
```

### Error Toast

```
┌─────────────────────────────────┐
│ ❌ Failed to cache meetings      │
│    Network error: timeout       │
└─────────────────────────────────┘
```

## Code Location

**File**: `src/hooks/useCachedMeetings.ts`

**Lines**: 80-144 (Cache effect with progress toast)

**Key Logic**:
```typescript
// Only show progress if cache is empty
const shouldShowProgress = cachedMeetings.length === 0 && totalMeetings > 0;

// Create animated toast
progressToast = await showToast({
  style: Toast.Style.Animated,
  title: `Caching 1 of ${totalMeetings} meetings`,
});

// Update on each iteration
progressToast.title = `Caching ${current} of ${totalMeetings} meetings`;

// Convert to success
progressToast.style = Toast.Style.Success;
progressToast.title = `Cached ${totalMeetings} meetings`;
progressToast.message = "Full-text search now available";
```

## Testing

### Test Scenarios

**1. First Load (Empty Cache)**
```bash
# Clear cache first
# Then run: npm run dev
# Open "Search Meetings"
# Expected: Progress toast from 1 to N meetings
```

**2. Subsequent Load (Cache Exists)**
```bash
# Run: npm run dev
# Open "Search Meetings" (second time)
# Expected: No toast, instant load
```

**3. Manual Refresh**
```bash
# In empty state, click "Refresh Cache"
# Expected: "Refreshing meetings..." then progress toast
```

**4. Error Handling**
```bash
# Disconnect network
# Clear cache and open "Search Meetings"
# Expected: Error toast with message
```

### Manual Testing Checklist

- [ ] First load shows progress toast
- [ ] Toast counts from 1 to total meetings
- [ ] Success toast shows with message
- [ ] Subsequent loads have no toast
- [ ] Manual refresh shows appropriate toasts
- [ ] Error states display error toast
- [ ] Toast auto-hides after success

## Performance Notes

- Toast updates are non-blocking
- Caching happens sequentially (to show accurate progress)
- Each update is ~10-50ms per meeting
- Total caching time: ~0.5-2.5s for 50 meetings
- Toast remains visible for ~2s after success

## Future Enhancements

Potential improvements:
1. **Batch Updates**: Update toast every 5 meetings instead of every meeting
2. **Percentage**: Show "Caching... 50%" instead of counts
3. **Estimated Time**: "Caching... ~30s remaining"
4. **Cancel Action**: Add action to cancel caching
5. **Background Sync**: Cache in background without blocking UI

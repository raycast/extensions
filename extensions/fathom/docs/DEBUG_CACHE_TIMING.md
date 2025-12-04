# Cache Timing Debug Guide

## Issue Description

When loading Search Meetings with a clear cache:
- **Expected**: Toast appears immediately showing "Caching 1 of 50 meetings"
- **Actual**: 3-5 second delay, then toast shows only "Cached 10 meetings"

## Root Cause Analysis

### Problem 1: Only 10 Meetings Cached (Not 50)

**Issue**: The UI was applying date filters BEFORE caching, so only meetings from the last month were being cached.

**Original Flow** (BROKEN):
```
1. API fetches ALL meetings (no filter)
2. UI filters to last month's meetings (e.g., 10 meetings)
3. Only those 10 meetings get cached
```

**Fixed Flow**:
```
1. API fetches ALL meetings (no filter)
2. ALL meetings get cached (e.g., 50 meetings)
3. UI applies date filter for DISPLAY only
```

### Problem 2: Toast Appears Late

The delay is likely caused by the timing of when effects run:

**Effect Execution Order**:
1. Component mounts
2. `useCachedMeetings` hook initializes
3. **Effect 1**: Load cached meetings from storage (empty on first run)
4. **Effect 2**: Trigger API fetch (via `useCachedPromise`)
5. **Wait for API response** ← 3-5 second delay here
6. **Effect 3**: Cache meetings and show toast

## Debug Logging Added

### Console Log Format

All logs are prefixed for easy filtering:
- `[Cache]` - Cache-related operations
- `[API]` - API fetch operations  
- `[UI]` - UI filtering/display operations

### What to Look For

When you run the extension with a clear cache, you should see:

```
[Cache] Loading cached meetings from storage...
[Cache] Loaded 0 cached meetings
[API] Fetching meetings from API with filter: {}
[Cache] Cache effect triggered { enableCache: true, hasApiData: false, ... }
[Cache] Skipping cache effect - conditions not met
[API] Received 50 meetings from API
[Cache] Cache effect triggered { enableCache: true, hasApiData: true, apiDataCount: 50, ... }
[Cache] Processing 50 meetings from API
[Cache] Should show progress toast: true (cache empty: true)
[Cache] Creating progress toast...
[Cache] Progress toast created
[Cache] Finished caching 50 meetings
[Cache] Reloaded cache, now have 50 meetings
[Cache] Updated toast to success
[UI] Starting filter/search with 50 cached meetings
[UI] After search: 50 meetings
[UI] After date filter: 10 meetings (filtered out 40)
```

### Key Timing Points

1. **Cache Load** (instant): `[Cache] Loaded 0 cached meetings`
2. **API Fetch Start**: `[API] Fetching meetings from API with filter: {}`
3. **API Fetch Complete** (3-5s delay): `[API] Received 50 meetings from API`
4. **Toast Creation**: `[Cache] Creating progress toast...`
5. **Caching Progress**: Updates for each meeting
6. **Success**: `[Cache] Updated toast to success`

## Expected Behavior After Fix

### First Load (Empty Cache)

**Timeline**:
```
0ms:   Component mounts
10ms:  [Cache] Loaded 0 cached meetings
20ms:  [API] Fetching meetings from API...
3000ms: [API] Received 50 meetings
3010ms: [Cache] Creating progress toast... ← TOAST APPEARS HERE
3500ms: [Cache] Cached 50 meetings (success toast)
```

**Console Output**:
```
[Cache] Loading cached meetings from storage...
[Cache] Loaded 0 cached meetings
[API] Fetching meetings from API with filter: {}
[API] Received 50 meetings from API
[Cache] Cache effect triggered { ... apiDataCount: 50, cachedCount: 0 }
[Cache] Processing 50 meetings from API
[Cache] Should show progress toast: true
[Cache] Creating progress toast...
[Cache] Progress toast created
[Cache] Finished caching 50 meetings
[Cache] Reloaded cache, now have 50 meetings
[Cache] Updated toast to success
[UI] Starting filter/search with 50 cached meetings
[UI] After date filter: 10 meetings (filtered out 40)
```

### Subsequent Loads (Cache Exists)

**Timeline**:
```
0ms:   Component mounts
10ms:  [Cache] Loaded 50 cached meetings
20ms:  Meetings display immediately (no API call, no toast)
```

**Console Output**:
```
[Cache] Loading cached meetings from storage...
[Cache] Loaded 50 cached meetings
[UI] Starting filter/search with 50 cached meetings
[UI] After date filter: 10 meetings (filtered out 40)
```

## Why the Toast Appears Late

The toast can only appear AFTER:
1. ✅ Cache is loaded (instant)
2. ✅ API fetch completes (3-5 seconds) ← **This is the delay**
3. ✅ Cache effect runs with API data
4. ✅ Toast is created

**The 3-5 second delay is the API fetch time**, which is unavoidable. The toast appears immediately after the API responds.

## Potential Solutions

### Option 1: Show "Loading" Toast Earlier (Recommended)

Show a toast as soon as the API fetch starts:

```typescript
// In useCachedMeetings hook
useEffect(() => {
  if (cachedMeetings.length === 0 && isApiLoading) {
    showToast({
      style: Toast.Style.Animated,
      title: "Loading meetings...",
    });
  }
}, [isApiLoading, cachedMeetings.length]);
```

### Option 2: Show Loading State in UI

Instead of relying on toast, show loading state in the list:

```typescript
{isLoading && cachedMeetings.length === 0 && (
  <List.EmptyView
    icon={Icon.Clock}
    title="Loading meetings..."
    description="Fetching your recent meetings from Fathom"
  />
)}
```

### Option 3: Prefetch in Background

Start fetching meetings as soon as Raycast opens (before user navigates to command).

## Testing Instructions

### Clear Cache and Test

1. **Clear cache**:
   ```typescript
   // Add temporarily to code or run in console
   import { clearAllCache } from "./utils/cache";
   await clearAllCache();
   ```

2. **Open Developer Console**:
   - In Raycast: `Cmd + Shift + D` (Developer Mode)
   - Check console logs

3. **Open Search Meetings**:
   - Watch console for log sequence
   - Note timing between API fetch and toast

4. **Verify**:
   - [ ] API fetches 50 meetings (not 10)
   - [ ] All 50 meetings get cached
   - [ ] Toast shows "Cached 50 meetings"
   - [ ] UI displays 10 meetings (date filtered)
   - [ ] Second load is instant (no API call)

### Expected Console Output

```bash
# First load (empty cache)
[Cache] Loading cached meetings from storage...
[Cache] Loaded 0 cached meetings
[API] Fetching meetings from API with filter: {}
[Cache] Cache effect triggered { enableCache: true, hasApiData: false, ... }
[Cache] Skipping cache effect - conditions not met
# ... 3-5 second delay ...
[API] Received 50 meetings from API
[Cache] Cache effect triggered { enableCache: true, hasApiData: true, apiDataCount: 50, ... }
[Cache] Processing 50 meetings from API
[Cache] Should show progress toast: true (cache empty: true)
[Cache] Creating progress toast...
[Cache] Progress toast created
# ... caching progress ...
[Cache] Finished caching 50 meetings
[Cache] Reloaded cache, now have 50 meetings
[Cache] Updated toast to success
[UI] Starting filter/search with 50 cached meetings
[UI] After search: 50 meetings
[UI] After date filter: 10 meetings (filtered out 40)
```

## Summary

### What Was Fixed
1. ✅ **Caching all meetings** instead of just filtered ones
2. ✅ **Added comprehensive logging** to track timing
3. ✅ **Separated caching from UI filtering** (cache all, filter for display)

### What's Still Expected
- **3-5 second delay** before toast appears is normal (API fetch time)
- Toast appears immediately AFTER API responds
- This is unavoidable without prefetching or showing earlier loading state

### Recommendation
Consider implementing **Option 1** (show "Loading meetings..." toast earlier) to provide immediate feedback when cache is empty.

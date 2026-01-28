# Rate Limiting Improvements

## Summary
Implemented graceful rate limit handling to prevent crashes and improve user experience when the Fathom API rate limits are exceeded.

## Changes Made

### 1. **Exponential Backoff with Retry Logic** (`src/fathom/api.ts`)
- Added automatic retry mechanism with exponential backoff for rate-limited requests
- Retries up to 3 times with increasing delays (1s, 2s, 4s with ±25% jitter)
- Prevents "thundering herd" problem with randomized jitter
- Provides informative error messages after exhausting retries

**Key Features:**
- `MAX_RETRIES = 3` - Maximum number of retry attempts
- `INITIAL_RETRY_DELAY = 1000ms` - Starting delay
- `MAX_RETRY_DELAY = 10000ms` - Maximum delay cap
- Jitter (±25%) to prevent synchronized retries

### 2. **Improved Team Color Caching** (`src/utils/teamColors.ts`)
- Extended stale cache duration from 5 minutes to 1 hour during API failures
- Gracefully degrades when rate limited - returns stale cache instead of crashing
- Better error differentiation between rate limits and other errors
- Falls back to empty cache if no data available (colors simply won't show)

**Cache Strategy:**
- Fresh cache: 5 minutes (normal operation)
- Stale cache: 1 hour (used when API fails)
- Prevents repeated API calls during rate limit periods

### 3. **Component-Level Error Handling**
Updated all components that fetch team colors to handle errors gracefully:
- `src/components/MeetingListItem.tsx`
- `src/view-action-item-detail.tsx`
- `src/view-action-items.tsx`
- `src/search-teams.tsx`

**Error Handling Pattern:**
```typescript
const { data: teamColor } = useCachedPromise(
  async (teamName: string | null) => {
    if (!teamName) return undefined;
    try {
      return await getTeamColor(teamName);
    } catch (error) {
      console.warn("Failed to fetch team color:", error);
      return undefined;
    }
  },
  [teamName],
  {
    initialData: undefined,
    keepPreviousData: true,
    onError: (error) => {
      console.warn("Team color fetch error:", error);
    },
  },
);
```

## Benefits

1. **No More Crashes**: Extension continues to work even when rate limited
2. **Better UX**: Automatic retries happen transparently to the user
3. **Reduced API Load**: Stale cache prevents repeated failed requests
4. **Graceful Degradation**: Team colors simply don't show instead of breaking the UI
5. **Informative Logging**: Console logs help debug rate limit issues

## Testing

Build the extension:
```bash
npm run build
```

The extension will now:
- Automatically retry rate-limited requests with exponential backoff
- Use cached team colors when API is unavailable
- Continue functioning without team colors if cache is empty
- Log helpful messages to the console for debugging

## Future Improvements

Consider:
- Adding a user-visible toast notification when rate limits are hit (optional)
- Implementing a global rate limiter to prevent hitting limits in the first place
- Adding metrics to track rate limit occurrences

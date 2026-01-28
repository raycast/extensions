# Debugging Rate Limits - Enhanced Logging Guide

## Overview

We've added comprehensive logging to track down the source of rate limiting. The logs now show:

1. **Every API call** with caller information
2. **Request queue operations** (enqueue, deduplicate, execute)
3. **Cache manager state** (load, fetch, cooldown)
4. **Team color fetching** (pagination, caching)
5. **Hook lifecycle** (subscribe, unsubscribe, updates)

## Log Prefixes & Emojis

### API Layer (`src/fathom/api.ts`)
- `[API] 🌐 HTTP GET` - Raw HTTP request being made
- `[API] ✅ Success` - HTTP request succeeded
- `[API] ⚠️  RATE LIMITED` - Hit rate limit, retrying
- `[API] ❌ RATE LIMIT EXCEEDED` - Max retries exhausted
- `[API] 📋 listMeetings` - List meetings function called
- `[API] 📝 getMeetingSummary` - Get summary function called
- `[API] 📄 getMeetingTranscript` - Get transcript function called
- `[API] 👥 listTeams` - List teams function called
- `[API] 👤 listTeamMembers` - List team members function called

### Request Queue (`src/utils/requestQueue.ts`)
- `[Queue] Enqueued request` - Request added to queue
- `[Queue] Deduplicating request` - Duplicate request prevented (GOOD!)
- `[Queue] Executing request` - Request starting execution
- `[Queue] Completed request` - Request finished successfully
- `[Queue] Failed request` - Request failed with error

### Cache Manager (`src/utils/cacheManager.ts`)
- `[CacheManager] Subscriber added/removed` - Component subscribed/unsubscribed
- `[CacheManager] Loading cache from storage` - Loading from LocalStorage
- `[CacheManager] Loaded N cached meetings` - Cache loaded successfully
- `[CacheManager] Cache already loaded` - Using existing cache
- `[CacheManager] Fetch request for filter` - API fetch requested
- `[CacheManager] Fetch cooldown active` - Prevented rapid re-fetch (GOOD!)
- `[CacheManager] Executing API call` - Actually calling API
- `[CacheManager] Caching N meetings` - Storing meetings in cache
- `[CacheManager] Skipping cache - same data` - Duplicate data prevented (GOOD!)

### Team Colors (`src/utils/teamColors.ts`)
- `[TeamColors] Using cached team colors` - Using cached colors (GOOD!)
- `[TeamColors] 🎨 Fetching teams for color mapping` - Fetching all teams
- `[TeamColors] Fetching teams page N` - Paginating through teams
- `[TeamColors] Page N: Got X teams` - Page results
- `[TeamColors] ✅ Cached N teams` - Teams cached successfully
- `[TeamColors] 🔍 Getting color for team` - Looking up team color
- `[TeamColors] Team "X" -> #color` - Color lookup result

### Hook Lifecycle (`src/hooks/useCachedMeetings.ts`)
- `[useCachedMeetings] Subscribing to cache manager` - Hook mounting
- `[useCachedMeetings] Unsubscribing from cache manager` - Hook unmounting
- `[useCachedMeetings] Received cache update` - Got cache update
- `[useCachedMeetings] Cache empty, fetching from API` - Fetching because empty
- `[useCachedMeetings] Using cached data` - Using cache (GOOD!)

## What to Look For

### 🟢 GOOD Patterns (No API Calls)

```
[CacheManager] Cache already loaded (19 meetings)
[useCachedMeetings] Using cached data (19 meetings)
[Queue] Deduplicating request: fetch-meetings:{}
[CacheManager] Fetch cooldown active (3s remaining), using cached data
[TeamColors] Using cached team colors (5 teams, 45s old)
```

### 🟡 EXPECTED Patterns (Minimal API Calls)

```
[CacheManager] Loading cache from storage...
[CacheManager] Loaded 19 cached meetings
[TeamColors] 🎨 Fetching teams for color mapping...
[API] 📋 listMeetings called with filter: {}
[API] 🌐 HTTP GET /meetings?include_summary=true&include_transcript=true
[API] ✅ Success /meetings
```

### 🔴 BAD Patterns (Too Many API Calls)

```
[API] 🌐 HTTP GET /meetings (attempt 1/4)
[API] 🌐 HTTP GET /meetings (attempt 1/4)  // Duplicate!
[API] 🌐 HTTP GET /meetings (attempt 1/4)  // Duplicate!
[API] ⚠️  RATE LIMITED on /meetings - Retrying...
[API] ⚠️  RATE LIMITED on /teams - Retrying...
```

## Common Rate Limiting Causes

### 1. Team Color Pagination Storm

**Symptom:**
```
[TeamColors] 🎨 Fetching teams for color mapping...
[TeamColors] Fetching teams page 1
[TeamColors] Fetching teams page 2
[TeamColors] Fetching teams page 3
...
[API] ⚠️  RATE LIMITED on /teams
```

**Cause:** You have many teams, and the team color utility paginates through ALL of them.

**Solution:** Team colors are cached for 5 minutes. The first load will be slow, but subsequent loads should use cache.

**Fix if needed:** Reduce pagination or disable team colors temporarily.

### 2. Multiple Hook Instances

**Symptom:**
```
[useCachedMeetings] Subscribing to cache manager
[useCachedMeetings] Subscribing to cache manager  // Duplicate!
[useCachedMeetings] Subscribing to cache manager  // Duplicate!
[CacheManager] Fetch request for filter: {}
[CacheManager] Fetch request for filter: {}  // Duplicate!
```

**Cause:** React Strict Mode or multiple views mounting simultaneously.

**Solution:** The cache manager should deduplicate these. Check for:
- `[Queue] Deduplicating request` - Good!
- `[CacheManager] Fetch cooldown active` - Good!

**Fix if needed:** Already implemented with cooldown and deduplication.

### 3. Rapid Re-renders

**Symptom:**
```
[useCachedMeetings] Unsubscribing from cache manager
[useCachedMeetings] Subscribing to cache manager
[useCachedMeetings] Unsubscribing from cache manager
[useCachedMeetings] Subscribing to cache manager
```

**Cause:** Component unmounting and remounting rapidly (React Strict Mode in development).

**Solution:** This is expected in development. The cache manager handles it with:
- Concurrent load prevention
- 5-second fetch cooldown
- Request deduplication

**Fix if needed:** Already implemented.

### 4. Per-Meeting API Calls

**Symptom:**
```
[API] 📝 getMeetingSummary called for recordingId: abc123
[API] 📝 getMeetingSummary called for recordingId: def456
[API] 📝 getMeetingSummary called for recordingId: ghi789
...
[API] ⚠️  RATE LIMITED on /recordings/*/summary
```

**Cause:** Fetching summaries individually for each meeting.

**Solution:** The `listMeetings` call now includes `include_summary=true` and `include_transcript=true`, so summaries should be embedded in the meeting data.

**Fix if needed:** Verify that meeting detail views use the embedded data first.

## Debugging Workflow

### Step 1: Identify the Source

Look for the **first** API call that triggers rate limiting:

```bash
# In the terminal logs, search for:
[API] 🌐 HTTP GET
```

The caller information will show you which function triggered it:
```
[API] 🌐 HTTP GET /teams (attempt 1/4) - Called from: at fetchAndCacheTeams (teamColors.ts:67:32)
```

### Step 2: Count Duplicate Calls

Count how many times the same endpoint is called:

```bash
# Example: If you see this 20 times, you have a problem
[API] 🌐 HTTP GET /teams
[API] 🌐 HTTP GET /teams
[API] 🌐 HTTP GET /teams
...
```

### Step 3: Check Deduplication

Verify that deduplication is working:

```bash
# You should see these for duplicate requests:
[Queue] Deduplicating request: fetch-meetings:{}
[CacheManager] Fetch cooldown active (Xs remaining)
```

If you DON'T see these, the deduplication isn't working.

### Step 4: Check Cache Usage

Verify that cached data is being used:

```bash
# You should see:
[useCachedMeetings] Using cached data (19 meetings)
[TeamColors] Using cached team colors (5 teams, 45s old)
```

If you see `[useCachedMeetings] Cache empty, fetching from API` repeatedly, the cache isn't persisting.

## Expected API Call Pattern (Normal Operation)

### On First Load (Cold Start)

```
18:00:00 [CacheManager] Loading cache from storage...
18:00:00 [CacheManager] Loaded 0 cached meetings
18:00:00 [useCachedMeetings] Cache empty, fetching from API
18:00:00 [CacheManager] Fetch request for filter: {}
18:00:00 [Queue] Enqueued request: fetch-meetings:{} (priority: 1, queue size: 1)
18:00:00 [Queue] Executing request: fetch-meetings:{} (in-flight: 0/3)
18:00:00 [CacheManager] Executing API call for: {}
18:00:00 [API] 📋 listMeetings called with filter: {}
18:00:00 [API] 🌐 HTTP GET /meetings?include_summary=true&include_transcript=true (attempt 1/4)
18:00:01 [API] ✅ Success /meetings
18:00:01 [Queue] Completed request: fetch-meetings:{}
18:00:01 [CacheManager] Caching 10 meetings
18:00:02 [CacheManager] ✅ Cached 10 meetings with colors (fetched 1 pages)
18:00:02 [CacheManager] Notifying 1 listeners
18:00:02 [useCachedMeetings] Received cache update: 10 meetings
```

**Total API calls: 1** (just `/meetings`)

### On Subsequent Loads (Warm Cache)

```
18:05:00 [CacheManager] Cache already loaded (10 meetings)
18:05:00 [useCachedMeetings] Using cached data (10 meetings)
18:05:00 [CacheManager] Fetch cooldown active (4s remaining), using cached data
```

**Total API calls: 0** (using cache)

### With Team Colors (First Time)

```
18:00:00 [TeamColors] 🎨 Fetching teams for color mapping...
18:00:00 [TeamColors] Fetching teams page 1
18:00:00 [API] 👥 listTeams called with args: {}
18:00:00 [API] 🌐 HTTP GET /teams (attempt 1/4)
18:00:01 [API] ✅ Success /teams
18:00:01 [TeamColors] Page 1: Got 5 teams, nextCursor: no
18:00:01 [TeamColors] ✅ Cached 5 teams with colors (fetched 1 pages)
```

**Total API calls: 1** (just `/teams`)

### With Team Colors (Cached)

```
18:02:00 [TeamColors] Using cached team colors (5 teams, 120s old)
```

**Total API calls: 0** (using cache)

## Maximum Expected API Calls

For a normal extension load with:
- 10 meetings
- 5 teams (1 page)
- No previous cache

**Expected API calls:**
1. `/meetings` - 1 call
2. `/teams` - 1 call

**Total: 2 API calls**

If you see more than 5 API calls on a fresh load, something is wrong.

## Troubleshooting

### If you see 10+ API calls:

1. **Check for team pagination:**
   - Look for `[TeamColors] Fetching teams page N`
   - If N > 3, you have many teams
   - Consider disabling team colors temporarily

2. **Check for duplicate requests:**
   - Look for multiple `[API] 🌐 HTTP GET /meetings`
   - Should see `[Queue] Deduplicating request` for duplicates
   - If not, the queue isn't working

3. **Check for rapid re-fetches:**
   - Look for `[CacheManager] Fetch cooldown active`
   - If not appearing, cooldown isn't working

### If you see rate limiting:

1. **Identify the endpoint:**
   ```
   [API] ⚠️  RATE LIMITED on /teams
   ```

2. **Count the attempts:**
   - Should be max 3 retries per request
   - If seeing 20+ retries, multiple requests are failing

3. **Check the caller:**
   ```
   Called from: at fetchAndCacheTeams (teamColors.ts:67:32)
   ```

4. **Fix the source:**
   - If team colors: Increase cache duration or disable
   - If meetings: Check deduplication
   - If summaries: Use embedded data

## Quick Fixes

### Disable Team Colors Temporarily

```typescript
// In src/components/MeetingListItem.tsx
// Comment out this line:
// const teamColor = useTeamColor(meeting.recordedByTeam);

// And use a default color:
const teamColor = "#007AFF";
```

### Increase Cache Durations

```typescript
// In src/utils/cacheManager.ts
private FETCH_COOLDOWN = 30000; // 30 seconds (was 5)

// In src/utils/teamColors.ts
const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes (was 5)
```

### Reduce Concurrency

```typescript
// In src/utils/requestQueue.ts
private maxConcurrent = 1; // Only 1 request at a time (was 3)
```

## Success Criteria

After the fixes, you should see:

✅ **No rate limiting errors** in normal usage  
✅ **Max 2-3 API calls** on first load  
✅ **0 API calls** on subsequent loads (using cache)  
✅ **Deduplication messages** for duplicate requests  
✅ **Cooldown messages** for rapid re-fetches  
✅ **Cache hit messages** for team colors  

If you're still seeing issues, share the logs and we'll dig deeper!

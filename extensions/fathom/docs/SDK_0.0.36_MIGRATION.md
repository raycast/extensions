# Fathom SDK v0.0.36 Migration

**Date**: October 31, 2025  
**SDK Version**: `fathom-typescript@0.0.36`

## Issues Fixed

### 1. Duplicate Meeting Entries

**Problem**: Meetings appeared twice in the list (e.g., "garret kane" and "Ekaterina Erygina" meetings)

**Root Cause**: The converter was incorrectly using `m.url.split("/").pop()` for both `id` and `recordingId`, which could result in duplicate keys when the same meeting was cached multiple times.

**Fix**: Updated `convertSDKMeeting()` to use the SDK's native `recordingId` field:

```typescript
// Before (v0.0.30)
id: m.url.split("/").pop() || m.url,
recordingId: m.url.split("/").pop() || m.url,

// After (v0.0.36)
const recordingId = String(m.recordingId);
id: recordingId,
recordingId,
```

### 2. Missing Metadata (Date, Team, Action Items)

**Problem**: Some meeting rows were missing:

- Date (createdAt)
- Team badge
- Action items count
- Duration

**Root Cause**: The SDK v0.0.36 changed the Meeting structure significantly:

- `recordingId` is now a `number` instead of being extracted from URL
- `createdAt` is now a `Date` object
- `actionItems` is now directly available in the response
- `recordedBy` now includes `team` and `name` fields

**Fix**: Updated converter to extract all new fields:

```typescript
return {
  id: recordingId,
  title: m.title || "Untitled",
  meetingTitle: m.meetingTitle || undefined,
  startTimeISO: recordingStart,
  createdAt: m.createdAt.toISOString(),  // ✅ NEW
  durationSeconds,
  teamId: undefined,
  teamName: recordedByTeam || null,
  recordedByTeam,  // ✅ NEW
  recordedByName,  // ✅ NEW
  url: m.url,
  shareUrl: m.shareUrl,  // ✅ NEW
  recordedByUserId: m.recordedBy.email,
  recordingId,
  actionItemsCount,  // ✅ NEW
  actionItems: m.actionItems || undefined,  // ✅ NEW
  calendarInvitees: [...],
  calendarInviteesDomains: [...],
};
```

### 3. "NOT_FOUND" Error When Viewing Meeting Details

**Problem**: Clicking on a meeting to view summary/transcript resulted in:

```typescript
NOT_FOUND: The requested resource was not found.
```

**Root Cause**: The `recordingId` was being set incorrectly. The old code extracted it from the URL path (e.g., `"423691167"` from `https://fathom.video/calls/423691167`), but the SDK now provides it as a number field directly.

When the converter used the wrong ID format, API calls to `/recordings/{recordingId}/summary` would fail with 404.

**Fix**: Use the SDK's native `recordingId` field and convert it to string:

```typescript
const recordingId = String(m.recordingId);
```

## SDK v0.0.36 Breaking Changes

### Import Path Changes

The SDK reorganized its type exports. All model types have moved from `models/` to `sdk/models/shared/`:

```typescript
// ❌ Old (v0.0.30)
import type { Meeting } from "fathom-typescript/models/meeting";
import type { Team } from "fathom-typescript/models/team";
import type { TeamMember } from "fathom-typescript/models/teammember";

// ✅ New (v0.0.36)
import type { Meeting } from "fathom-typescript/sdk/models/shared/meeting";
import type { Team } from "fathom-typescript/sdk/models/shared/team";
import type { TeamMember } from "fathom-typescript/sdk/models/shared/teammember";
```

### Meeting Type Structure

| Field | v0.0.30 | v0.0.36 | Notes |
|-------|---------|---------|-------|
| `recordingId` | Extracted from URL | `number` | Now a direct field |
| `createdAt` | Not available | `Date` | New field |
| `meetingTitle` | Not available | `string \| null` | Calendar event title |
| `shareUrl` | Not available | `string` | Dedicated share URL |
| `actionItems` | Not available | `ActionItem[]` | Direct array |
| `recordedBy.team` | Not available | `string \| null` | Team name |
| `recordedBy.name` | Not available | `string` | User name |
| `meetingType` | `"internal" \| "external"` | Removed | Use `calendarInviteesDomainsType` |

### FathomUser Type (New in v0.0.36)

```typescript
type FathomUser = {
  name: string;
  email: string;
  emailDomain: string;
  team: string | null;
};
```

This replaces the previous simple email string for `recordedBy`.

## Migration Checklist

- [x] Update SDK type import paths from `models/` to `sdk/models/shared/`
- [x] Update `convertSDKMeeting()` to use new field structure
- [x] Extract `recordingId` as number and convert to string
- [x] Extract `createdAt` from Date object
- [x] Extract `actionItems` array
- [x] Extract `recordedBy.team` and `recordedBy.name`
- [x] Use `shareUrl` instead of `url` for sharing
- [x] Fix type narrowing for `calendarInvitees` to avoid implicit `any` types
- [x] Remove legacy `Recording` type and related unused functions
- [x] Update HTTP fallback to match new structure
- [x] Test meeting list display
- [x] Test meeting detail views (summary, transcript, action items)
- [x] Test caching with new data structure

## Testing

After clearing cache and local storage:

1. **Meeting List**: All meetings should display with:
   - ✅ Date (e.g., "Oct 30, 2025")
   - ✅ Team badge (e.g., "Product")
   - ✅ Action items count (e.g., "5")
   - ✅ Duration (e.g., "57m")

2. **No Duplicates**: Each meeting should appear only once

3. **Meeting Details**: Clicking on any meeting should:
   - ✅ Load summary successfully
   - ✅ Load transcript successfully
   - ✅ Load action items successfully
   - ✅ No "NOT_FOUND" errors

## Code Cleanup

### Removed Legacy Code

The following unused code was removed as part of the v0.0.36 migration:

1. **`Recording` type** (Types.ts) - Legacy type that predated the Meeting-based implementation
2. **`mapRecordingFromMeeting()` function** (converters.ts) - Only used by the unused `listRecentRecordings()` function
3. **`listRecentRecordings()` function** (api.ts) - Never called anywhere in the codebase

**Rationale**: With SDK v0.0.36, the `Meeting` type now includes all necessary fields (`recordingId`, `createdAt`, `actionItems`, etc.), making the separate `Recording` abstraction unnecessary. The Meeting type serves as the single source of truth for recording data.

## Files Modified

- `src/utils/converters.ts` - Updated SDK type imports and `convertSDKMeeting()` function
  - Changed import paths from `models/` to `sdk/models/shared/`
  - Fixed `recordingId` extraction to use SDK's number field
  - Added extraction for `createdAt`, `actionItems`, `recordedBy.team`, `recordedBy.name`
  - Improved type narrowing for `calendarInvitees` and `calendarInviteesDomains`
  - Removed unused `mapRecordingFromMeeting()` function and `Recording` import
- `src/fathom/api.ts` - Cleaned up unused functions and imports
  - Removed unused `listRecentRecordings()` function
  - Removed `Recording` type import
  - Removed `mapRecordingFromMeeting` import
- `package.json` - SDK version: `0.0.30` → `0.0.36`
- `docs/FATHOM_SDK_FEEDBACK.md` - Updated version references

## Related Issues

- Duplicate entries in meeting list
- Missing metadata (date, team, action items)
- NOT_FOUND errors when viewing meeting details
- Cache invalidation after SDK update

## Additional Improvements Made

### Fixed PageIterator Usage

**Issue**: `listTeams()` and `listTeamMembers()` were incorrectly treating SDK responses as direct data objects instead of iterating over the `PageIterator`.

**Fix**: Updated both functions to properly iterate over the async iterator:

```typescript
const result = await client.listTeams({ cursor: args.cursor });
const items: Team[] = [];
let nextCursor: string | undefined = undefined;

for await (const response of result) {
  if (!response?.result) continue;
  const teamListResponse = response.result;
  items.push(...teamListResponse.items.map(convertSDKTeam));
  nextCursor = teamListResponse.nextCursor || undefined;
  break; // Only get first page
}
```

This matches the pattern used in `listMeetings()` and ensures consistent SDK usage across all list operations.

## Known Limitations & Future Improvements

### 1. Summary/Transcript SDK Methods Not Used

The SDK provides `getRecordingSummary()` and `getRecordingTranscript()` methods, but they require `recordingId: number` while our codebase uses `string` throughout.

**Current**: Direct HTTP calls
**Potential**: Convert to SDK methods after addressing type conversion

### 2. Type Mismatch: recordingId

**SDK expects**: `recordingId: number`
**Codebase uses**: `recordingId: string`

This is handled by converting the SDK's number to string in `convertSDKMeeting()`, but creates friction when calling SDK methods that expect numbers.

### 3. HTTP Fallback Feature Parity

The HTTP fallback in `listMeetingsHTTP()` supports filters (`teams[]`, `recorded_by[]`) that aren't exposed in the SDK's `listMeetings()` method. This suggests either:

- The SDK doesn't support all API features yet
- These filters need to be added to SDK method calls

### 4. Duplicate Parsing Logic

`mapMeetingFromHTTP()` (170+ lines) duplicates much of the conversion logic. With SDK v0.0.36's improved types, we may be able to reduce reliance on HTTP fallbacks and simplify this code.

## Recommendations

1. **Clear Extension Cache**: Users should clear Raycast extension cache after this update to remove old cached data with incorrect structure
2. **Monitor API Responses**: Watch for any new validation errors from SDK v0.0.36
3. **Update Feedback Doc**: Track any new issues discovered with v0.0.36
4. **Consider Type Refactoring**: Evaluate whether to use `number` for `recordingId` internally to better align with SDK expectations
5. **Test All List Operations**: Verify teams and team members lists work correctly with the PageIterator fixes

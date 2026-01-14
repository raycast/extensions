# Fathom TypeScript SDK Feedback

**SDK Version**: `fathom-typescript@0.0.36`  
**Date**: October 31, 2025  
**Integration**: Raycast Extension for Fathom  
**Reporter**: Chris Messina (via AI pair programming)

---

## Summary

The Fathom TypeScript SDK is well-structured and follows modern patterns, but has **overly strict Zod validation** that fails even when the API returns valid, successful responses. This requires implementing HTTP fallbacks for production use.

---

## Issues Encountered

### 1. ResponseValidationError on Valid API Responses

**Severity**: High  
**Impact**: Blocks SDK usage in production

#### Description

The SDK throws `ResponseValidationError` even when:

- API returns HTTP 200 (success)
- Response body contains valid, well-formed JSON
- All required fields are present
- Data structure matches API documentation

#### Error Details

```
ResponseValidationError: Response validation failed
    at safeParseResponse
    at matchFunc
    at async $do4
{
  statusCode: 200,
  body: `{"items":[{"title":"...","meeting_title":"...","url":"...","recording_id":90283312,...}]}`
}
```

#### Example API Response (Valid)

```json
{
  "items": [
    {
      "title": "Mia Cao: 60-min Strategy Call (Chris Messina)",
      "meeting_title": "Mia Cao: 60-min Strategy Call (Chris Messina)",
      "url": "https://fathom.video/calls/423691167",
      "created_at": "2025-09-27T17:59:24Z",
      "scheduled_start_time": "2025-09-27T17:00:00Z",
      "scheduled_end_time": "2025-09-27T18:00:00Z",
      "recording_id": 90283312,
      "recording_start_time": "2025-09-27T17:00:44Z",
      "recording_end_time": "2025-09-27T17:59:15Z",
      "calendar_invitees_domains_type": "one_or_more_external",
      "transcript": null,
      "transcript_language": "en",
      "default_summary": null,
      "action_items": [
        {
          "description": "Revise Product Hunt launch materials...",
          "user_generated": false,
          "completed": false,
          "recording_timestamp": "00:17:38",
          "recording_playback_url": "https://fathom.video/calls/423691167?timestamp=1058.9999",
          "assignee": {
            "name": "oratis wang",
            "email": null,
            "team": null
          }
        }
      ],
      "calendar_invitees": [...],
      "recorded_by": {...}
    }
  ],
  "limit": 50,
  "next_cursor": null
}
```

This response is **valid per the API documentation** but fails SDK validation.

#### Suspected Causes

1. **Nullable fields**: The SDK may not properly handle `null` values in fields like:
   - `transcript: null`
   - `default_summary: null`
   - `assignee.email: null`
   - `assignee.team: null`
   - `next_cursor: null`

2. **Nested object validation**: Action items and assignees have nullable fields that may not match the Zod schema

3. **Field type mismatches**: Possible strict type checking (e.g., `recording_id` as integer vs string)

#### Workaround Implemented

```typescript
export async function listMeetings(filter: MeetingFilter): Promise<Paginated<Meeting>> {
  try {
    const client = getFathomClient();
    const result = await client.listMeetings({...});
    return { items, nextCursor };
  } catch (error) {
    // Silent fallback when API succeeds but SDK validation fails
    if (error && typeof error === "object" && "statusCode" in error && error.statusCode === 200) {
      return await listMeetingsHTTP(filter); // Direct HTTP call
    }
    throw error;
  }
}
```

---

## Recommendations

### 1. Relax Zod Validation for Nullable Fields

**Priority**: High

Make the SDK more permissive with nullable fields. Consider:

```typescript
// Current (too strict)
transcript: z.array(TranscriptItem)

// Suggested (more flexible)
transcript: z.array(TranscriptItem).nullable().optional()
```

Apply this pattern to all fields that the API documents as nullable.

### 2. Add Validation Error Details

**Priority**: Medium

When validation fails, include **which field(s)** failed validation:

```typescript
throw new ResponseValidationError(
  `Response validation failed: ${zodError.issues.map(i => i.path.join('.')).join(', ')}`,
  { statusCode, body, validationErrors: zodError.issues }
);
```

This would help developers debug issues quickly.

### 3. Provide Partial Validation Mode

**Priority**: Medium

Add an SDK option to use partial validation:

```typescript
const client = new Fathom({
  security: { apiKeyAuth: "..." },
  validation: "partial" // or "strict" (default), "none"
});
```

In partial mode, return successfully parsed fields and log warnings for failed fields instead of throwing.

### 4. Export Type Guards

**Priority**: Low

Export the Zod schemas as type guards for manual validation:

```typescript
import { isMeeting, validateMeeting } from "fathom-typescript/validators";

// Type guard
if (isMeeting(data)) { ... }

// Manual validation with details
const result = validateMeeting(data);
if (!result.success) {
  console.log(result.errors);
}
```

---

## Positive Feedback

### What Works Well

1. **Clean API Design**: The SDK interface is intuitive and follows TypeScript best practices
2. **Type Safety**: Generated types are comprehensive and accurate
3. **Pagination Pattern**: The async iterator pattern for pagination is elegant
4. **Tree Shaking**: Standalone functions support is great for bundle size
5. **Documentation**: The docs site is clear and well-organized

### Example of Good Design

```typescript
// Love this pattern!
const result = await client.listMeetings({
  cursor: "...",
  calendarInvitees: ["user@example.com"],
});

for await (const page of result) {
  console.log(page.result.items);
}
```

---

## Additional Observations

### 1. Missing `share_url` in SDK Types

The API returns `share_url` but the SDK's `Meeting` type doesn't include it. We had to map it manually:

```typescript
// API returns
{
  "url": "https://fathom.video/calls/423691167",
  "share_url": "https://fathom.video/share/xyz123"  // Missing in SDK types
}
```

**Suggestion**: Add `shareUrl` to the `Meeting` interface.

### 2. `recording_id` Type Inconsistency

The API returns `recording_id` as an integer, but it's used as a string in URL paths. Consider:

```typescript
interface Meeting {
  recordingId: number | string; // Support both
}
```

### 3. Team Information Not in Meetings Response

The API doesn't return team information in the meetings list, only in `recorded_by.team`. This makes filtering by team difficult without additional API calls.

**Suggestion**: Consider adding a top-level `team` field to meetings or expanding the `recorded_by` object.

### 4. Teams and Team Members Validation Issues

**Severity**: High  
**Impact**: Same validation issues as meetings

Both `listTeams()` and `listTeamMembers()` suffer from the same `ResponseValidationError` issues:

```typescript
// Both require HTTP fallbacks
ResponseValidationError: Response validation failed
    at safeParseResponse
    at matchFunc
    at async $do5 (listTeamMembers)
    at async $do6 (listTeams)
```

**API Response Structure** (Teams):

```json
{
  "items": [
    {
      "name": "Product",
      "created_at": "2025-01-15T10:30:00Z"
    }
  ],
  "next_cursor": null
}
```

**API Response Structure** (Team Members):

```json
{
  "items": [
    {
      "name": "Chris Messina",
      "email": "chris@example.com",
      "team": "Product",
      "created_at": "2025-01-15T10:30:00Z"
    }
  ],
  "next_cursor": null
}
```

**Issue**: The `/team_members` API endpoint does NOT return the `team` field unless you filter by a specific team. This makes it impossible to build team filters from an unfiltered member list.

**Root Cause**: API behavior is confusing and undocumented:

```typescript
// API Response WITHOUT team filter
GET /team_members
{
  "items": [
    {
      "name": "Chris Messina",
      "email": "chris@example.com",
      // No "team" field!
      "created_at": "2025-01-15T10:30:00Z"
    }
  ]
}

// API Response WITH team filter
GET /team_members?team=Product
{
  "items": [
    {
      "name": "Chris Messina",
      "email": "chris@example.com",
      "team": "Product",  // ✅ NOW it's present!
      "created_at": "2025-01-15T10:30:00Z"
    }
  ]
}
```

**Workaround Implemented** (in `src/search-team-members.tsx`):

To build a team filter dropdown, we must:

1. Fetch teams list separately from `/teams` endpoint
2. Use team names to populate the dropdown
3. When a team is selected, fetch members with `?team=TeamName` filter
4. When "All Teams" is selected, fetch all members (no team grouping available)

```typescript
// Fetch teams separately
const { data: teamsData } = useCachedPromise(async () => listTeams({}), []);

// Fetch members based on selected team
const { data: membersData } = useCachedPromise(
  async (teamName: string) => listTeamMembers(teamName || undefined, {}),
  [selectedTeam]
);
```

**Impact**: This requires two separate API calls and makes it impossible to show a grouped view of all members by team without N+1 queries (one per team).

**Recommendation**:

1. ✅ **High Priority**: Always return the `team` field in team member responses (regardless of filter)
2. ✅ Add `team?: string | null` field to SDK's `TeamMember` interface
3. ✅ Add `createdAt?: string` (ISO 8601 timestamp) to `TeamMember` interface
4. Add `createdAt?: string` to `Team` interface
5. Fix validation to accept nullable `next_cursor` in pagination responses
6. **Document this behavior** in API docs if it's intentional

**Why This Matters**:

The current API design forces inefficient patterns:

- **Current (inefficient)**: To show members grouped by team, you must:
  1. Call `/teams` to get team list (1 API call)
  2. Call `/team_members?team=X` for each team (N API calls)
  3. Result: N+1 queries for a simple grouped list view

- **Proposed (efficient)**: If `team` field was always returned:
  1. Call `/team_members` once (1 API call)
  2. Group members client-side by `team` field
  3. Result: Single API call, better performance, simpler code

**Real-World Impact**:

In our Raycast extension, we had to choose between:

- ❌ Making N+1 API calls to show grouped members (slow, rate limit risk)
- ✅ Showing ungrouped "All Members" when no filter is selected (less useful UX)

We chose the latter to avoid performance issues, but it's a compromise forced by the API design.

**Suggested API Enhancement**:

```json
// GET /team_members (no filter)
{
  "items": [
    {
      "name": "Chris Messina",
      "email": "chris@example.com",
      "team": "Product",  // ✅ Always include this
      "created_at": "2025-01-15T10:30:00Z"
    },
    {
      "name": "Jane Doe",
      "email": "jane@example.com",
      "team": "Engineering",  // ✅ Always include this
      "created_at": "2025-01-15T10:30:00Z"
    }
  ]
}
```

This simple change would enable efficient client-side grouping and filtering without additional API calls.

### 5. Rate Limiting Behavior

**Observation**: HTTP 429 responses are returned as HTML, not JSON:

```html
Status 429 Content-Type text/html. Body: ""
```

**Impact**: Makes it difficult to parse rate limit details (retry-after, limit info, etc.)

**Suggestion**: Return rate limit errors as JSON with helpful metadata:

```json
{
  "error": "rate_limit_exceeded",
  "message": "Too many requests",
  "retry_after": 60,
  "limit": 100,
  "window": "1m"
}
```

This would allow clients to implement intelligent backoff strategies.

---

## Testing Environment

- **Runtime**: Node.js (Raycast extension environment)
- **TypeScript**: 5.8.2
- **Package Manager**: npm
- **Use Case**: Raycast extension for searching and managing Fathom meetings
- **API Endpoint**: `https://api.fathom.ai/external/v1`
- **Authentication**: API Key (X-Api-Key header)

---

## Impact on Integration

### Current State

- ✅ Extension works with HTTP fallback
- ✅ All API features accessible
- ❌ Cannot use SDK directly (validation errors)
- ❌ Increased code complexity (dual implementation)
- ❌ Missing SDK benefits (automatic retries, rate limiting, etc.)

### Ideal State

- ✅ Use SDK exclusively
- ✅ Proper error handling from SDK
- ✅ Type safety throughout
- ✅ Automatic updates when SDK improves

---

## Code References

For implementation details, see:

- **Client Factory**: `src/fathom/client.ts`
- **API Layer with Fallback**: `src/fathom/api.ts`
  - `listMeetings()` - Lines 48-110 (SDK + HTTP fallback)
  - `listTeams()` - Lines 282-324 (SDK + HTTP fallback)
  - `listTeamMembers()` - Lines 344-417 (SDK + HTTP fallback)
- **Type Definitions**: `src/types/Types.ts`
- **Type Converters**: `src/utils/converters.ts` (includes workaround for missing team field)
- **Search Commands**: 
  - `src/search-meetings.tsx`
  - `src/search-teams.tsx`
  - `src/search-team-members.tsx`

### Implementation Workarounds Summary

1. **HTTP Fallback Pattern**: All SDK calls wrapped in try-catch with direct HTTP implementation
2. **Type Casting**: Manual `(tm as any).team` to extract team field from TeamMember responses
3. **Rate Limit Handling**: Custom error detection for HTTP 429 responses
4. **Nullable Field Handling**: Client-side filtering of null values before processing
5. **Pagination**: Using HTTP fallback exclusively for reliable pagination

---

## Contact

For questions or clarification about this feedback:

- **GitHub**: [@chrismessina](https://github.com/chrismessina)
- **Extension**: [raycast-fathom](https://github.com/chrismessina/raycast-fathom)

---

## Appendix: Full Error Stack

```typescript
ResponseValidationError: Response validation failed
    at safeParseResponse (/Users/messina/.config/raycast/extensions/fathom/search-meetings.js:17840:16)
    at matchFunc (/Users/messina/.config/raycast/extensions/fathom/search-meetings.js:17822:9)
    at process.processTicksAndRejections (node:internal/process/task_queues:105:5)
    at async $do4 (/Users/messina/.config/raycast/extensions/fathom/search-meetings.js:19251:25)
{
  statusCode: 200,
  body: '{"items":[...full response body...], "limit": 50, "next_cursor": null}'
}
```

---

**Last Updated**: October 31, 2025  
**SDK Version Tested**: 0.0.36  
**Features Tested**: Meetings, Teams, Team Members, Summaries, Transcripts  
**Latest Issue Added**: Missing `team` field in TeamMember TypeScript interface

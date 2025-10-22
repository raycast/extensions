# Fathom API Alignment - Types.ts

## Overview

The `src/types/Types.ts` file has been updated to **align with the official Fathom API specification**, ensuring all types accurately reflect the API responses and available parameters.

## Key Changes

### 1. **Meeting Interface** - Comprehensive API Alignment

**Added Fields:**
- `recordingId` - The API's primary identifier (integer, stored as string)
- `meetingTitle` - Calendar event title (distinct from Fathom's generated title)
- `shareUrl` - Shareable meeting URL
- `createdAt` - When the recording was created
- `scheduledStartTime` / `scheduledEndTime` - Calendar event times
- `recordingEndTime` - Actual recording end time
- `calendarInviteesDomainType` - "only_internal" | "one_or_more_external"
- `transcriptLanguage` - Language code (e.g., "en")
- `recordedByName` - Name of the person who recorded
- `recordedByTeam` - Team of the recorder

**Clarified Fields:**
- `title` - Fathom's AI-generated title (not the calendar title)
- `url` - Changed from optional to required (API always provides this)
- `startTimeISO` - Now documented as `recording_start_time` from API
- `isExternal` - Derived from `calendarInviteesDomainType` for backwards compatibility

### 2. **Team Interface** - API-Accurate

**Added:**
- `createdAt` - When the team was created (ISO 8601 timestamp)

**Documented:**
- `id` - Clarified this is derived from `name` (API doesn't provide separate ID)
- `name` - Marked as required (per API specification)
- `memberCount` - Marked as future use (not in current API)

### 3. **TeamMember Interface** - API-Accurate

**Added:**
- `createdAt` - When the member joined (ISO 8601 timestamp)

**Changed:**
- `email` - Now **required** (not optional, per API spec)

**Documented:**
- `id` - Clarified as derived from email
- `team` - Used when filtering, not returned by API

### 4. **Summary Interface** - Matches API Response

**Added:**
- `templateName` - The summary template used (nullable)

**Documented:**
- `text` - Now documented as `markdown_formatted` from API, always in English

### 5. **TranscriptSegment Interface** - Enhanced

**Added:**
- `speakerEmail` - Matched calendar invitee email (nullable)
- `timestamp` - Original HH:MM:SS format from API

**Documented:**
- All fields now have clear API mappings
- Explains conversion from API's HH:MM:SS to seconds

### 6. **MeetingFilter Interface** - Complete API Parameters

**Added Missing API Parameters:**
- `calendarInviteesDomainType` - Filter by internal/external
- `createdAfter` / `createdBefore` - Time-based filtering
- `recordedBy` - Email addresses of recorders (renamed from `recordedByUserIds`)
- `teams` - Team names filter (renamed from `teamIds`)
- `includeCrmMatches` - Include CRM data
- `includeSummary` - Include summary in response
- `includeTranscript` - Include transcript in response

**Changed:**
- `meetingType` - Updated to include "all" option (per API)
- Documented which fields are for local UI filtering vs API parameters

**Removed:**
- None (kept all for backwards compatibility)

### 7. **New Type Exports**

**Added:**
```typescript
export type CalendarInviteesDomainType = "all" | "only_internal" | "one_or_more_external";
```

**Updated:**
```typescript
export type MeetingType = "all" | "internal" | "external"; // Added "all"
```

## API Reference Documentation Used

All changes are based on official Fathom API documentation:

- [List Meetings](https://developers.fathom.ai/api-reference/meetings/list-meetings.md)
- [List Teams](https://developers.fathom.ai/api-reference/teams/list-teams.md)  
- [List Team Members](https://developers.fathom.ai/api-reference/team-members/list-team-members.md)
- [Get Transcript](https://developers.fathom.ai/api-reference/recordings/get-transcript.md)
- [Get Summary](https://developers.fathom.ai/api-reference/recordings/get-summary.md)

## Field Mapping Reference

### Meeting API → Extension Type

| API Field | Extension Field | Notes |
|-----------|----------------|-------|
| `recording_id` | `recordingId` | Integer in API, string in extension |
| `title` | `title` | Fathom's generated title |
| `meeting_title` | `meetingTitle` | Calendar event title |
| `url` | `url` | fathom.video URL |
| `share_url` | `shareUrl` | Shareable URL |
| `created_at` | `createdAt` | ISO 8601 |
| `scheduled_start_time` | `scheduledStartTime` | ISO 8601 |
| `scheduled_end_time` | `scheduledEndTime` | ISO 8601 |
| `recording_start_time` | `startTimeISO` | ISO 8601 |
| `recording_end_time` | `recordingEndTime` | ISO 8601 |
| `calendar_invitees_domains_type` | `calendarInviteesDomainType` | Enum |
| `transcript_language` | `transcriptLanguage` | Language code |
| `calendar_invitees[].email` | `calendarInvitees` | Array of emails |
| `recorded_by.email` | `recordedByUserId` | Email address |
| `recorded_by.name` | `recordedByName` | Person's name |
| `recorded_by.team` | `recordedByTeam` | Team name |

### Team API → Extension Type

| API Field | Extension Field | Notes |
|-----------|----------------|-------|
| `name` | `name` | Required |
| `name` | `id` | Duplicated as ID |
| `created_at` | `createdAt` | ISO 8601 |

### TeamMember API → Extension Type

| API Field | Extension Field | Notes |
|-----------|----------------|-------|
| `name` | `name` | Required |
| `email` | `email` | Required |
| `email` | `id` | Duplicated as ID |
| `created_at` | `createdAt` | ISO 8601 |

## Backwards Compatibility

All existing fields have been **preserved** to maintain compatibility with current code. New fields are all optional, so existing components will continue to work without modification.

## Migration Notes

### For Meeting Components

If you want to use the new fields:

```typescript
// Access the new fields
const meeting: Meeting = {
  // ... existing fields
  meetingTitle: "QBR 2025 Q1", // Calendar title
  shareUrl: "https://fathom.video/share/xyz",
  createdAt: "2025-03-01T17:01:30Z",
  calendarInviteesDomainType: "one_or_more_external",
  recordedByName: "Alice Johnson",
  recordedByTeam: "Sales"
};
```

### For Filtering

Use the new filter parameters:

```typescript
const filter: MeetingFilter = {
  createdAfter: "2025-01-01T00:00:00Z",
  createdBefore: "2025-12-31T23:59:59Z",
  calendarInviteesDomainType: "only_internal",
  recordedBy: ["alice@acme.com", "bob@acme.com"],
  teams: ["Sales", "Engineering"],
  includeCrmMatches: true,
  includeTranscript: false
};
```

## Type Safety Improvements

1. **Required vs Optional** - Fields now accurately reflect API requirements
2. **Null vs Undefined** - Proper nullable types where API allows null
3. **String Enums** - Type-safe enums for `MeetingType` and `CalendarInviteesDomainType`
4. **Clear Documentation** - Every field has inline comments explaining API mapping

## Build Verification

✅ TypeScript compilation: **Success**  
✅ No breaking changes: **Confirmed**  
✅ All existing functionality: **Preserved**

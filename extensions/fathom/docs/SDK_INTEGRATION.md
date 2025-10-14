# Fathom TypeScript SDK Integration

## Overview

This extension now uses the official Fathom TypeScript SDK with a clean, type-safe client pattern.

## Architecture

### Client Initialization (`src/fathom/client.ts`)

The client factory provides a **singleton Fathom SDK instance**:

```typescript
import { getFathomClient } from "./fathom/client";

const client = getFathomClient();
const meetings = await client.listMeetings({});
```

**Key features:**
- **Singleton pattern**: Client is cached for performance
- **Type-safe**: Full TypeScript support from the SDK
- **Error handling**: Clear errors if API key is missing
- **Simple**: Single import, zero configuration

### API Layer (`src/fathom/api.ts`)

The API layer converts SDK responses to the extension's internal types:

**SDK Methods Used:**
- `client.listMeetings()` - Returns paginated meeting data
- `client.listTeams()` - Returns team list
- `client.listTeamMembers()` - Returns team member list

**HTTP Fallback:**
For endpoints not yet in the SDK (summary, transcript), we use direct HTTP with the API key.

### Type Converters

Clean converter functions map SDK types to extension types:

```typescript
convertSDKMeeting(sdkMeeting) → Meeting
convertSDKTeam(sdkTeam) → Team  
convertSDKTeamMember(sdkMember) → TeamMember
```

## Benefits of This Approach

### ✅ Before (Old Implementation)
- Mixed SDK and HTTP calls with complex fallbacks
- Unsafe `require()` and type casting with `unknown`
- Try-catch blocks around every SDK call
- Manual type mapping from raw JSON
- Duplicated error handling

### ✅ After (New Implementation)
- **Single source of truth**: `client.ts` handles all SDK initialization
- **Type safety**: Proper TypeScript imports and types
- **Cleaner code**: No fallback logic, simpler functions
- **Better errors**: Clear error messages from SDK
- **Maintainable**: Easy to add new endpoints

## Usage Examples

### Getting Meetings

```typescript
import { listMeetings } from "./fathom/api";

const { items, nextCursor } = await listMeetings({
  cursor: undefined,
  calendarInvitees: ["user@example.com"],
});
```

### Getting Teams

```typescript
import { listTeams } from "./fathom/api";

const { items, nextCursor } = await listTeams({
  cursor: undefined,
});
```

### Direct SDK Access

For advanced use cases, you can use the SDK client directly:

```typescript
import { getFathomClient } from "./fathom/client";

const client = getFathomClient();
const result = await client.listMeetings({ 
  includeTranscript: true,
  includeCrmMatches: true 
});

for await (const page of result) {
  console.log(page.result.items);
}
```

## File Structure

```
src/fathom/
├── client.ts       # SDK client factory (NEW)
├── api.ts          # API functions with type converters
└── sdk.ts          # REMOVED (old hacky implementation)
```

## SDK Documentation

- [Installation](https://developers.fathom.ai/sdks/typescript-installation)
- [GitHub](https://github.com/fathom/fathom-typescript)
- Package: `fathom-typescript@0.0.30`

## Migration Notes

If you need to add a new endpoint:

1. Check if it exists in the SDK (see SDK docs)
2. If yes: Use `getFathomClient()` and call the method
3. If no: Use `authGet()` helper for direct HTTP
4. Add a type converter if the response format differs

## Configuration

The API key is configured in Raycast preferences:
- **Preference key**: `fathomApiKey`
- **Type**: Password (secure)
- **Required**: Yes
- **Location**: Extension Preferences → Fathom API Key

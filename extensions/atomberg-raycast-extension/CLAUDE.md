# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Raycast extension for controlling Atomberg smart appliances (primarily fans) through their IoT API. The extension allows users to view, manage, and control their Atomberg devices directly from Raycast.

## Development Commands

```bash
npm run dev          # Start development mode with hot reload
npm run build        # Build the extension for production
npm run lint         # Check code style and potential issues
npm run fix-lint     # Auto-fix linting issues
npm run publish      # Publish to Raycast Store
```

## Architecture Overview

### Core Structure

- **Two main commands**:
  - `list-atomberg-devices` (device listing with push navigation to device controls)
  - `manage-atomberg-credentials` (credential management)
- **Internal navigation**: Device control interface accessed via Action.Push from device list
- **Service-oriented architecture** with clear separation of concerns
- **Custom React hooks** for state management and API interaction
- **Centralized configuration** through constants and types

### Key Components

**API Service Layer (`src/services/atomberg-api.ts`)**

- `AtombergApiService` class handles all Atomberg API interactions
- Manages JWT token lifecycle (24-hour expiry with 5-minute refresh buffer)
- Implements proper authentication flow using API key + refresh token → access token
- Handles device listing, control commands, device state fetching, and error management

**State Management with TanStack Query v5**

- `useAtombergQuery` (`src/hooks/useAtombergQuery.ts`): Core query hooks with smart caching
  - `useDevicesList`: Device list with 5-minute cache, perfect for infrequent changes
  - `useDeviceState`: Real-time device state with 10-second cache + 30s background refetch
  - `useDeviceControl`: Mutations with optimistic updates and cache invalidation
- `useAtombergDevices`: Wrapper hook for device list operations
- `useDeviceState`: Wrapper hook for individual device state management
- Query client setup with intelligent retry logic and error handling

**UI Components (`src/components/`)**

- `DeviceItem`: Individual device list item with control actions
- `EmptyStates`: Reusable empty state views for different scenarios

**Utility Layer (`src/utils/device-utils.ts`)**

- Pure functions for data transformation (grouping devices by room)
- Credential validation utilities

### Authentication Flow

1. User configures API key and refresh token in Raycast preferences
2. Extension uses refresh token to obtain 24-hour access token from `/get_access_token`
3. Access token is cached in LocalStorage with expiry tracking
4. All API calls use access token + API key headers
5. Tokens auto-refresh when needed (5-minute buffer before expiry)

### API Integration

**Base URL**: `https://api.developer.atomberg-iot.com/v1`

**Key Endpoints**:

- `GET /get_access_token` - Authentication (requires refresh token + API key)
- `GET /get_list_of_devices` - Device listing
- `GET /get_device_state` - Get real-time device state and status
- `POST /devices/{id}/command` - Device control

**Response Patterns**:
All API responses follow `{ status: "Success", message: {...} }` structure.

### Data Flow with Smart Caching

1. **Device Listing**: `useDevicesList` → TanStack Query (5min cache) → `AtombergApiService.fetchDevices()` → UI components
2. **Device State**: `useDeviceState` → TanStack Query (10s cache, 30s refetch) → `AtombergApiService.fetchDeviceState()` → Real-time UI updates
3. **Command Execution**: User action → `useDeviceControl` mutation → Optimistic updates → Cache invalidation → Background refetch
4. **Room Grouping**: Cached devices → `groupDevicesByRoom()` → `List.Section` components
5. **Navigation**: Device list → Action.Push → Device commands view with seamless navigation
6. **Error Handling**: TanStack Query retry logic → Automatic auth error detection → User feedback

### Configuration Management

- **Constants** (`src/constants.ts`): API URLs, endpoints, storage keys
- **Types** (`src/types.ts`): TypeScript interfaces for API responses and app state
- **Preferences**: Secure storage of API credentials via Raycast's password-type preferences

### Common Patterns

**Error Handling**: Centralized in service layer with Toast notifications
**Loading States**: Managed through custom hook with proper state transitions  
**Component Structure**: Functional components with proper prop interfaces
**Memory Management**: Careful use of `useMemo` and `useCallback` to prevent unnecessary re-renders

## Important Notes

- API credentials are stored securely using Raycast's preference system (password type)
- Access tokens are cached locally but never committed to version control
- All API calls require both API key (header) and access token (Bearer auth)
- Device rooms are used for UI organization with alphabetical sorting
- Extension supports light/dark theme through proper icon assets
- Device commands view uses Raycast's List with detail panel for split interface
- Left panel shows executable commands, right panel shows real-time device state
- Real-time device state includes power, speed, sleep mode, LED, timers, and timestamps
- Navigation between views uses Raycast's Action.Push for seamless internal navigation
- TanStack Query v5 provides intelligent caching, background updates, and error handling

## Device Commands Interface

The split-panel device commands view provides:

**Left Panel - Command List:**

- **Power Control**: Toggle device on/off
- **Speed Control**: Increase/decrease fan speed by 1 level
- **Feature Toggles**: Oscillation, sleep mode, LED indicators
- **Timer Management**: Set 1h/2h timers or cancel existing timers
- **Interactive Execution**: Click any command to execute immediately

**Right Panel - Live Device State:**

- **Connection status** (online/offline) with color-coded indicators  
- **Power state** and current fan speed level
- **Active features** (sleep mode, LED status)
- **Timer information** (remaining hours and elapsed time)
- **Device metadata** (ID, last update timestamp, brightness, color)
- **Auto-refresh** after command execution with 1-second delay

## Smart Caching Strategy

**TanStack Query v5 Integration:**

**Device List Caching (5 minutes)**

- Long cache duration since device configuration rarely changes
- Background refetch disabled for optimal performance
- Perfect for device names, rooms, and static metadata

**Device State Caching (10 seconds + 30s background refetch)**

- Short cache with frequent updates for real-time feel
- Background refetch every 30 seconds when component is mounted
- Refetch on window focus for immediate updates when user returns

**Command Mutations with Optimistic Updates**

- Immediate UI feedback before API response
- Automatic cache invalidation after successful commands
- Smart retry logic that skips auth errors
- Background state refetch to sync with actual device state

**Performance Benefits:**

- Reduced API calls and improved response times
- Offline-first experience with cached data
- Automatic background synchronization
- Smart error handling and retry logic

## Future Enhancements

- **UDP State Reading**: Direct device communication to avoid API rate limits
- **Device Controls**: Interactive controls for speed, oscillation, timers
- **Real-time Updates**: WebSocket or polling for live state changes
- **Device Grouping**: Advanced filtering and organization options

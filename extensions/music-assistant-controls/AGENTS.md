## Project Context

This is a Raycast extension for controlling Music Assistant, a home music server system. The extension provides menu bar controls and commands for music playback, player selection, and volume control.

## Code Quality Standards

### Testing Philosophy

- **Always write unit tests** - Don't forget tests like a "junior developer"
- **Proper test organization**: Put client tests in client test files, command-specific tests in command test files
- **Clean test files**: Remove unused imports, variables, and mock configurations
- **Focus on critical path**: Test business logic thoroughly (~69% coverage target, not 100%)
- **REST API testing**: Test `sendCommand()` comprehensively; individual wrapper methods inherit coverage
- **Regression tests**: Add tests for any bugs found to prevent recurrence
- **Test error cases**: Always test both success and failure scenarios

### Code Organization

- **Respect existing file structure**: Don't put tests in wrong files
- **Clean imports**: Group and organize import statements properly
- **No scattered imports**: Consolidate related imports together
- **Remove unused code**: Clean up unused variables, imports, and dependencies
- **Auto-generated Preferences**: Do NOT manually define a `Preferences` interface - Raycast auto-generates `Preferences` type in `raycast-env.d.ts` from `package.json`. Manual definitions can become out of sync. Use `getPreferenceValues<Preferences>()` directly; the type is auto-imported from the generated file.

### API Integration Patterns

- **Use existing patterns**: Follow established command patterns (play-pause, next-song, etc.)
- **Error handling**: Always handle API errors gracefully with try/catch
- **API exploration**: When APIs don't work as expected, investigate the actual available methods
- **Raycast-specific**: Use React Form components instead of imperative prompts (prompt() doesn't exist in Raycast)

### User Experience

- **Smart UI**: Only show controls for supported features (e.g., volume controls only for players that support them)
- **Visual feedback**: Use appropriate icons and status indicators
- **Real-time updates**: Refresh data when changes are made
- **Non-intrusive design**: Features should integrate naturally without overwhelming the interface

## Technical Stack

- **Framework**: Raycast extension using TypeScript and React
- **Testing**: Jest with comprehensive mocking
- **External API**: Music Assistant REST API (HTTP POST to `/api` endpoint)
- **UI Components**: Raycast's MenuBarExtra, Form, ActionPanel components
- **State Management**: useCachedPromise for API data, useLocalStorage for preferences

## REST API Architecture

This extension uses the Music Assistant REST API (NOT WebSocket) for simpler, more reliable integration:

- **API Endpoint**: `POST http://host:8095/api`
- **Authentication**: Bearer token in Authorization header
- **Request Format**: `{ "command": "...", "args": { ... } }`
- **Client**: `src/external-code/music-assistant-api.ts` - Sends REST API calls
- **Wrapper**: `src/api-command.ts` - Handles initialization and cleanup
- **Interface**: `src/music-assistant-client.ts` - High-level business logic
- **API Documentation**: `commands.json` - Complete Music Assistant API command reference with parameters, return types, and descriptions

### Key Implementation Details

- `sendCommand()` is the core method - all API calls go through it
- Error handling: Check for `error_code`, `error`, and `details` fields in response
- Always handle null/undefined responses safely
- No local caching maintained (each call is independent)
- Volume commands clamp values to 0-100 range
- Use `player_id` parameter for player-specific commands

### Available API Commands

The `commands.json` file contains extracted API documentation with all available Music Assistant commands, organized by category:

- **Auth**: Authentication, user management, token operations
- **Config**: Core controllers, providers, players, DSP configuration
- **Music**: Library items (albums, artists, tracks, playlists, podcasts, radio), favorites, playback tracking
- **Player**: Player control, queue management, volume, playback state
- **Metadata**: Enhanced metadata, lyrics, language preferences
- **Logging**: Application logs (admin only)

Each command entry includes:

- Command path (e.g., `player/cmd/play`, `music/artists/library_items`)
- Summary and detailed description
- Parameters with types and descriptions
- Return type
- Authentication requirements
- Required role (if admin-only)

## Development Workflow

- **Environment**: Use nvm to manage Node.js versions (follow .nvmrc)
- **Dependencies**: Run npm install after Node.js version changes
- **Testing**: Run tests after implementation and cleanup
- **Validation**: Test extension in development mode to ensure functionality
- **Pre-publish checks**: test, lint and build are automatically run before publishing via `prepublish` script
- **Publishing**: Use `npm run publish` (not `npm publish`) to publish to Raycast Store

## Code Style Preferences

- **Documentation**: Write comprehensive JSDoc comments for public methods
- **Error messages**: Provide clear, actionable error messages
- **Method naming**: Use descriptive names that indicate purpose and return type
- **Type safety**: Use TypeScript types properly, import from interfaces when needed

## Documentation Standards

- **README.md**: ❌ DO NOT MODIFY - Published on Raycast Store, contains official extension description
- **CONTRIBUTING.md**: Developer setup, commands, contribution guidelines, examples
- **TESTING.md**: Test coverage rationale, strategy, and known limitations
- **CHANGELOG.md**: Always update with new features, fixes, and improvements
- **Accuracy is critical**: Verify all technical details before writing
- **User-focused language**: Focus on what users experience, not implementation details

## Changelog Format

- **Use Raycast placeholder**: Use `{PR_MERGE_DATE}` instead of hardcoded dates - Raycast replaces this when PR is merged
- **Title format**: `## [Descriptive Title] - {PR_MERGE_DATE}`
- **Square brackets**: Always use square brackets around the version/title
- **Dash spacing**: Use `-` (space-dash-space) between title and date placeholder
- **Content structure**: Organize changes with clear headers (✨ New Features, 🔧 Technical Improvements, 🎨 UI/UX Enhancements)
- **Example format**:

  ```markdown
  ## [Volume Control Features] - {PR_MERGE_DATE}

  ### ✨ New Features

  - Feature description
  ```

## Music Assistant Specific

- **Player vs Queue**: Understand the distinction between players and queues
- **Volume control**: Check `volume_control` property before showing volume features
- **State management**: Use appropriate Music Assistant API methods for different operations
- **Real-time data**: Subscribe to updates and refresh cached data when needed

## UI/UX Guidelines

- **Menu bar design**: Use sections, separators, and submenus for logical grouping
- **Progressive disclosure**: Start with essential controls, use submenus for advanced features
- **Status indicators**: Show current state (playing/paused, volume level, mute status)
- **Feedback**: Provide user feedback for actions (toasts, HUD messages)

## Test Coverage Strategy

### Current Coverage: 69.15% statements, 53.73% branches, 67% functions

**Why not 100% coverage?**

- UI components (React/Raycast) require additional setup and are hard to test in isolation
- REST API wrapper methods are thin functions that delegate to `sendCommand()` - testing the underlying function is sufficient
- We focus on testing the critical path: error handling, business logic, and edge cases

**Full Coverage (100%)**

- api-command.ts, music-assistant-client.ts (99.15%), command implementations (next-song, play-pause)
- use-selected-player-id.ts, play-pause.tsx

**Strategic Coverage (20-80%)**

- music-assistant-api.ts: Only `sendCommand()` and error handling tested (20%)
- next-song.tsx, volume-up.tsx, volume-down.tsx: Core logic tested, some branches untested (57-60%)

**No Coverage (0%) - By Design**

- UI components (manage-player-groups.tsx - 5%, menu-bar.tsx - 0%)

See TESTING.md for detailed coverage breakdown and rationale.

## React Hooks & State Management

### Supported Hooks

- ✅ `useCachedPromise` - Caches API call results between command runs
- ✅ `useCachedState` - Persists state across command invocations (JSON serializable only)
- ✅ `useLocalStorage` - Stores user preferences and selections
- ✅ `usePromise` - For one-off async operations
- ✅ Standard React hooks: `useState`, `useEffect`

### Unsupported Hooks (Do NOT Use)

- ❌ `useMemo` - Not available in Raycast
- ❌ `useCallback` - Not available in Raycast
- ➡️ Use `useCachedPromise` with `execute` parameter instead to control when fetches happen


## Menu Bar Command Architecture

Menu bar commands have a **different lifecycle** than regular commands and must be optimized to prevent timeouts.

### Configuration (package.json)

```json
{
  "name": "menu-bar",
  "mode": "menu-bar",
  "interval": "10s" // Background refresh interval - fetch happens every 10 seconds
}
```

### Launch Types & Lifecycle

Menu bar commands execute in three distinct scenarios:

1. **Background Refresh** (`environment.launchType === "background"`)
   - Raycast runs the command at specified interval (every 10s)
   - Time budget: ~8-10 seconds per cycle
   - Use this to fetch fresh API data and update cache
   - Set `isLoading = true` while fetching

2. **User Opens Menu** (`environment.launchType === "userInitiated"`)
   - User clicks the menu bar icon to open the menu
   - Display cached data immediately - NO NEW API CALLS
   - Menu must appear instantly, no loading state shown
   - Set `isLoading = false` (or don't check it during user interaction)

3. **Raycast Restart/Resume**
   - Raycast restores menu bar item from database (no code execution)
   - Previous state persists from last background refresh cycle

### Critical Menu Bar Pattern

```typescript
import { environment } from "@raycast/api";
import { useCachedPromise, useCachedState } from "@raycast/utils";

export default function MenuBar() {
  const client = new MusicAssistantClient();
  const isBackgroundRefresh = environment.launchType === "background";

  // Persist data using useCachedState
  const [cachedData, setCachedData] = useCachedState("key", []);

  // Only fetch during background refresh
  const { isLoading, revalidate } = useCachedPromise(
    async () => {
      const data = await client.fetchData();
      setCachedData(data);  // Update cache for next user interaction
      return data;
    },
    [],
    {
      execute: isBackgroundRefresh,  // ⭐ CRITICAL: Only fetch in background
      keepPreviousData: true
    }
  );

  // Show loading ONLY during background refresh
  const showLoading = isBackgroundRefresh && isLoading;

  // Always use cached data for rendering
  const displayData = cachedData || [];

  return (
    <MenuBarExtra isLoading={showLoading} title={displayData?.title}>
      {/* Render displayData immediately */}
    </MenuBarExtra>
  );
}
```

### Why Menu Bar Timeouts Happened

**Problem**: Menu bar was fetching fresh API data **every time the command ran**, including when user clicked the menu icon.

- User opens menu → API call starts → API timeout (slow server) → Menu appears blank

**Solution**: Only fetch during 10-second background intervals

- Every 10s: Background refresh fetches data, updates cache, unloads command
- User opens menu: Display cached data instantly (no API call = no timeout) ⚡
- User clicks action: Manually call `revalidate()` to refresh

### Menu Bar Best Practices

1. **Use `execute: isBackgroundRefresh`** - Controls when `useCachedPromise` fetches
   - Prevents API calls during user menu interactions
   - Menu always responsive with cached data

2. **Always set `isLoading` correctly**
   - Use `showLoading = isBackgroundRefresh && isLoading`
   - Never show loading spinner when user opens menu

3. **Use `useCachedState` for persistence**
   - Survives between menu opens/closes
   - Menu always has data to display
   - JSON serializable values only

4. **Keep `revalidate()` for manual refresh**
   - Call in action handlers (next, play/pause, volume)
   - Let user trigger fresh data when they interact

5. **Set reasonable API timeout**
   - 8-10 seconds max per API call
   - Menu bar has limited time budget (interval is 10s)
   - Gracefully use cached data if timeout occurs

## Performance Optimization Patterns

### Menu Bar Timeout Resolution

The key insight: **Separate background data fetching from user-triggered displays**

**Before (Timeout)**:

- Command runs → Fetch new API data → Wait for response → Display menu
- If API slow: Menu blank for 5-10+ seconds or times out

**After (Instant)**:

- Background: Fetch data every 10s → Update cache → Unload
- User opens: Display cached data instantly ⚡ No API call

**Data Flow**:

```
Background Refresh (10s interval)
├─ Fetch fresh API data
├─ Update useCachedState cache
├─ Raycast waits max 8-10s, then unloads
└─ Menu shows new data on next user interaction

User Opens Menu
├─ Raycast loads command
├─ Display cached data immediately (< 100ms)
└─ Menu responsive & interactive

User Clicks Action
├─ Execute action
├─ Call revalidate() to update cache
└─ Menu refreshes with new data
```

### Performance Mistakes to Avoid

- ❌ Fetch fresh data every time menu bar renders (causes timeouts)
- ❌ Using `useMemo`/`useCallback` (unsupported, not needed with above pattern)
- ❌ Making sequential API calls instead of parallel
- ❌ Showing loading spinner when displaying cached data to user
- ❌ Very long titles in menu bar items
- ❌ Identical `MenuBarExtra.Item`s with same action at same level

## Anti-patterns to Avoid

- ❌ Modifying README.md (it's published on store)
- ❌ Testing individual REST API wrapper methods (test `sendCommand()` instead)
- ❌ Writing client tests in command test files
- ❌ Using prompt() or other non-existent Raycast APIs
- ❌ Forgetting to write tests
- ❌ Leaving unused imports or variables
- ❌ Ignoring error cases in tests
- ❌ Showing UI controls for unsupported features
- ❌ Hard-coding values that should be dynamic
- ❌ Removing error handling for null/undefined responses
- ❌ Using `useMemo` or `useCallback` (not supported by Raycast) - use `useCachedPromise` instead
- ❌ Fetching fresh API data every time menu bar renders (causes timeouts)
- ❌ Setting `execute: true` on all `useCachedPromise` calls in menu bar
- ❌ Setting `isLoading=true` when displaying cached data to user
- ❌ Making sequential API calls when parallel is possible
- ❌ Very long titles in menu bar items
- ❌ Identical `MenuBarExtra.Item`s with same action handler at same level
- ❌ Ignoring `environment.launchType` in menu bar commands

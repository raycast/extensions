## Project Context

This is a Raycast extension for controlling Music Assistant, a home music server system. The extension provides menu bar controls and commands for music playback, player selection, and volume control.

## Code Quality Standards

### Testing Philosophy

- **Always write unit tests** - Don't forget tests like a "junior developer"
- **Proper test organization**: Put client tests in client test files, command-specific tests in command test files
- **Clean test files**: Remove unused imports, variables, and mock configurations
- **Focus on critical path**: Test business logic thoroughly (61% coverage target, not 100%)
- **REST API testing**: Test `sendCommand()` comprehensively; individual wrapper methods inherit coverage
- **Regression tests**: Add tests for any bugs found to prevent recurrence
- **Test error cases**: Always test both success and failure scenarios

### Code Organization

- **Respect existing file structure**: Don't put tests in wrong files
- **Clean imports**: Group and organize import statements properly
- **No scattered imports**: Consolidate related imports together
- **Remove unused code**: Clean up unused variables, imports, and dependencies

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

### Key Implementation Details

- `sendCommand()` is the core method - all API calls go through it
- Error handling: Check for `error_code`, `error`, and `details` fields in response
- Always handle null/undefined responses safely
- No local caching maintained (each call is independent)
- Volume commands clamp values to 0-100 range
- Use `player_id` parameter for player-specific commands

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

### Current Coverage: 61% statements, 55% branches, 28% functions

**Why not 100% coverage?**

- UI components (React/Raycast) require additional setup and are hard to test in isolation
- REST API wrapper methods are thin functions that delegate to `sendCommand()` - testing the underlying function is sufficient
- We focus on testing the critical path: error handling, business logic, and edge cases

**Full Coverage (100%)**

- api-command.ts, music-assistant-client.ts, command implementations (next-song, play-pause)

**Strategic Coverage (20-80%)**

- music-assistant-api.ts: Only `sendCommand()` and error handling tested (20%)
- use-selected-player-id.ts: Core logic tested, some edge cases untested (80%)

**No Coverage (0%) - By Design**

- UI components (menu-bar.tsx, set-active-player.tsx, set-volume.tsx)

See TESTING.md for detailed coverage breakdown and rationale.

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

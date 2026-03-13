# Contributing to Music Assistant Raycast Extension

Thank you for your interest in contributing! This guide will help you set up your development environment and understand the project structure.

## Getting Started

### Prerequisites

- Node.js 22+ (as specified in [.nvmrc](.nvmrc))
- npm or yarn
- macOS or Windows (for testing the extension; menu bar command requires macOS)

### Setup

```bash
# Clone the repository
git clone https://github.com/your-username/music-assistant-controls.git
cd music-assistant-controls

# Install dependencies
npm install

# Start development server
npm run dev

# Build for testing
npm run build
```

## Development Commands

```bash
npm run dev         # Start development server with hot reload
npm run build       # Build the extension
npm run lint        # Lint code
npm run fix-lint    # Auto-fix linting issues
npm test            # Run tests
npm test:watch      # Run tests in watch mode
npm run test:coverage # Generate coverage report
```

## Testing

### Overview

This project has **285 tests passing** across 18 test suites with comprehensive coverage of core business logic, API interactions, and command implementations. We focus on testing the critical path rather than aiming for 100% coverage.

See [TESTING.md](./TESTING.md) for detailed information about test coverage, strategy, and guidelines.

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm test:watch

# Check coverage report
npm run test:coverage

# Run specific test file
npm test -- tests/music-assistant/music-assistant-client.test.ts
```

### Test Files by Category

**Core API & Client:**

- `music-assistant-api.test.ts` - REST API wrapper methods
- `music-assistant-client.test.ts` - High-level client logic
- `api-command.test.ts` - Command execution wrapper

**Commands:**

- `play-pause.test.ts`, `next-song.test.ts`, `previous-song.test.ts`
- `volume-up.test.ts`, `volume-down.test.ts`, `volume-mute.test.ts`
- `manage-player-groups.test.ts`

**Features:**

- `current-track-helpers.test.ts` - Track metadata and controls
- `music-library-hub/helpers.test.ts`, `music-library-hub/actions.test.ts` - Search and browse
- `shortcuts.test.ts` - Keyboard shortcut execution
- `use-selected-player-id.test.ts` - Player selection

**Utilities:**

- `player-list-helpers.test.ts` - Player grouping delegates
- `volume-validation.test.ts` - Input validation
- `interfaces-sync.test.ts` - Contract verification

## Code Style

This project uses:

- **ESLint** for linting
- **Prettier** for code formatting
- **TypeScript** for type safety

Before submitting a PR, ensure your code passes linting:

```bash
npm run lint
npm run fix-lint  # Auto-fixes most issues
```

## Making Changes

### Project Structure

```
src/
│
├── Commands (Raycast entry points)
│   ├── play-pause.tsx                 # Toggle playback
│   ├── next-song.tsx                  # Skip to next track
│   ├── previous-song.tsx              # Skip to previous track
│   ├── volume-up.tsx                  # Increase volume
│   ├── volume-down.tsx                # Decrease volume
│   ├── volume-mute.tsx                # Toggle mute state
│   ├── set-volume.tsx                 # Set volume precisely (with form)
│   ├── set-active-player.tsx          # Change active player
│   ├── manage-player-groups.tsx       # Create/manage player groups
│   ├── current-track.tsx              # View now-playing track details
│   ├── music-library-hub.tsx          # Search & browse library
│   └── menu-bar.tsx                   # Menu bar display & controls
│
├── Core Client Logic
│   ├── music-assistant/
│   │   ├── music-assistant-client.ts  # High-level client interface
│   │   ├── external-code/
│   │   │   ├── music-assistant-api.ts # REST API wrapper
│   │   │   └── interfaces.ts          # Type definitions
│   │   └── helpers/ (various helpers for specific features)
│   ├── api-command.ts                 # Command execution wrapper
│
├── Player Management
│   ├── player-management/
│   │   └── player-list-helpers.ts     # Delegate for player operations
│   └── player-selection/
│       └── use-selected-player-id.ts  # Queue selection logic
│
├── Feature-Specific Code
│   ├── current-track/
│   │   └── *-helpers.ts               # Track, favorites, shuffle, repeat
│   ├── music-library-hub/
│   │   ├── *-helpers.ts               # Search, browse, queue
│   │   └── *-actions.ts               # Playlist & queue actions
│   ├── set-volume/
│   │   └── volume-validation.ts       # Input validation
│   └── shortcuts/
│       └── shortcuts.ts               # Keyboard shortcut execution
│
└── Utilities
    ├── polyfills.ts                   # Browser compatibility
    └── ...other utilities

tests/
├── music-assistant/                   # API & Client tests
│   ├── music-assistant-api.test.ts
│   ├── music-assistant-client.test.ts
│   └── api-command.test.ts
│
├── commands/                          # Command tests
│   ├── play-pause.test.ts
│   ├── next-song.test.ts
│   ├── previous-song.test.ts
│   ├── volume-up.test.ts
│   ├── volume-down.test.ts
│   ├── volume-mute.test.ts
│   └── manage-player-groups.test.ts
│
├── current-track/                     # Feature tests
│   └── current-track-helpers.test.ts
│
├── music-library-hub/
│   ├── helpers.test.ts
│   └── actions.test.ts
│
├── player-management/
│   └── player-list-helpers.test.ts
│
├── player-selection/
│   └── use-selected-player-id.test.ts
│
├── shortcuts/
│   └── shortcuts.test.ts
│
├── set-volume/
│   └── volume-validation.test.ts
│
└── contracts/
    └── interfaces-sync.test.ts        # Type synchronization check
```

### REST API Implementation

This extension uses the Music Assistant REST API via HTTP POST requests to `http://host:8095/api`.

Key files:

- **src/music-assistant/external-code/music-assistant-api.ts** - REST API client with methods for all commands
- **src/api-command.ts** - Command execution wrapper (initialization, error handling, cleanup)
- **src/music-assistant/music-assistant-client.ts** - High-level business logic (smart routing, player groups, volume control)
- **commands.json** - Complete API reference with all available commands, parameters, and return types

### Adding Commands

When adding a new Music Assistant command:

1. **Add wrapper method to MusicAssistantApi** (if not already present)

```typescript
// src/music-assistant/external-code/music-assistant-api.ts
public async myNewCommand(playerId: string): Promise<void> {
  return this.sendCommand("players/cmd/my_command", {
    player_id: playerId,
  });
}
```

2. **Add business logic method to MusicAssistantClient** (if needed)

```typescript
// src/music-assistant/music-assistant-client.ts
async myNewCommand(playerId: string): Promise<void> {
  return await executeApiCommand(async (api) =>
    await api.myNewCommand(playerId)
  );
}
```

3. **Add tests**

```typescript
// tests/music-assistant/music-assistant-api.test.ts
it("should send my_command with correct parameters", async () => {
  mockFetch.mockResolvedValueOnce({
    ok: true,
    json: async () => ({ result: null }),
  } as Response);

  api.initialize("http://localhost:8095", "test-token");
  await api.myNewCommand("player-1");

  const callBody = JSON.parse(mockFetch.mock.calls[0][1]?.body as string);
  expect(callBody).toEqual({
    command: "players/cmd/my_command",
    args: {
      player_id: "player-1",
    },
  });
});
```

### Smart Volume Control Example

The codebase includes sophisticated volume control that intelligently routes commands based on player state:

```typescript
// Check if we should use group volume (leaders with members) or individual volume
const useGroupVolume = client.shouldUseGroupVolume(selectedPlayer);

if (useGroupVolume) {
  // Control entire group
  await client.groupVolumeUp(selectedPlayer.player_id);
} else {
  // Control individual player or member via group leader
  const targetId = client.getVolumeControlPlayer(selectedPlayer);
  await client.volumeUp(targetId);
}
```

### Adding Tests

When adding new functionality:

1. **Test business logic** - Focus on what the function does, not implementation details
2. **Test error cases** - What happens when the API fails?
3. **Test edge cases** - Null values, empty arrays, boundary conditions
4. **Use existing patterns** - Look at similar tests as templates

Example test structure:

```typescript
describe("newFeature", () => {
  beforeEach(() => {
    // Setup
  });

  it("should do something", async () => {
    // Arrange
    mockFetch.mockResolvedValueOnce({
      /* ... */
    });

    // Act
    const result = await api.newFeature();

    // Assert
    expect(result).toEqual(expected);
  });

  it("should handle errors gracefully", async () => {
    // Setup error condition
    mockFetch.mockRejectedValueOnce(new Error("Network error"));

    // Verify error is thrown
    await expect(api.newFeature()).rejects.toThrow();
  });
});
```

## Submitting Changes

1. **Create a feature branch** from `main`

   ```bash
   git checkout -b feat/my-feature
   ```

2. **Make your changes** and test thoroughly

   ```bash
   npm run dev          # Test locally
   npm test             # Run tests
   npm run lint         # Check code style
   ```

3. **Commit with descriptive messages**

   ```bash
   git commit -m "feat: add new command"
   ```

4. **Push and create a Pull Request**
   - Ensure all tests pass
   - Ensure code is properly linted
   - Provide a clear description of changes

## Known Issues & Limitations

See [TESTING.md](./TESTING.md) for:

- Known limitations in test coverage
- Why certain components aren't tested
- Future testing improvements

## Release Process

```bash
npm run prepublish    # Runs: test, lint, build
npm run publish       # Publish to Raycast Store
```

## Questions?

- Check existing issues and discussions
- Review the Music Assistant API docs: http://192.168.0.166:8095/api-docs
- Refer to [commands.json](./commands.json) for AI-assisted development and code generation
- Look at similar functionality in the codebase

## License

MIT - See LICENSE file for details

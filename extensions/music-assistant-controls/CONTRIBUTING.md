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

This project has comprehensive tests for core business logic with **61% overall coverage**. We focus on testing the critical path rather than aiming for 100% coverage.

See [TESTING.md](./TESTING.md) for detailed information about test coverage, strategy, and guidelines.

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm test:watch

# Check coverage report
npm run test:coverage

# Check detailed coverage
npm run test:coverage -- --collectCoverageFrom="src/**/*.{ts,tsx}"

# Run specific test file
npm test -- tests/music-assistant-api.test.ts
```

### Test Coverage Summary

| File                      | Coverage | Status |
| ------------------------- | -------- | ------ |
| api-command.ts            | 100%     | ✅     |
| music-assistant-client.ts | 100%     | ✅     |
| next-song.tsx             | 100%     | ✅     |
| play-pause.tsx            | 100%     | ✅     |
| interfaces.ts             | 100%     | ✅     |
| use-selected-player-id.ts | 80.95%   | ⚠️     |
| music-assistant-api.ts    | 20.77%   | ⚠️\*   |
| menu-bar.tsx              | 0%       | 🔸 UI  |
| set-active-player.tsx     | 0%       | 🔸 UI  |
| set-volume.tsx            | 0%       | 🔸 UI  |

\*See [TESTING.md](./TESTING.md) for rationale on coverage decisions.

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
├── api-command.ts              # REST API command wrapper
├── music-assistant-client.ts   # Core client logic
├── next-song.tsx               # Next song command UI
├── play-pause.tsx              # Play/pause command UI
├── set-volume.tsx              # Volume control UI
├── set-active-player.tsx       # Player selection UI
├── menu-bar.tsx                # Menu bar component
├── use-selected-player-id.ts   # Queue selection logic
├── polyfills.ts                # Browser polyfills
└── external-code/
    ├── interfaces.ts           # Type definitions
    └── music-assistant-api.ts  # REST API client

tests/
├── music-assistant-api.test.ts
├── music-assistant-client.test.ts
├── api-command.test.ts
├── next-song.test.ts
├── play-pause.test.ts
├── set-volume.test.ts
└── use-selected-player-id.test.ts
```

### REST API Implementation

This extension uses the Music Assistant REST API via HTTP POST requests to `http://host:8095/api`.

Key files:

- **src/external-code/music-assistant-api.ts** - REST API client
- **src/api-command.ts** - Command execution wrapper
- **src/music-assistant-client.ts** - High-level client interface

Example of adding a new command:

```typescript
// Add method to MusicAssistantApi class
public async myNewCommand(playerId: string): Promise<void> {
  return this.sendCommand("players/cmd/my_command", {
    player_id: playerId,
  });
}

// Add method to MusicAssistantClient class
async myNewCommand(playerId: string): Promise<void> {
  return await executeApiCommand(async (api) =>
    await api.myNewCommand(playerId)
  );
}

// Add test in tests/music-assistant-api.test.ts
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
- Look at similar functionality in the codebase

## License

MIT - See LICENSE file for details

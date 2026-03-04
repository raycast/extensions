# Testing Guide

**Test Suite: 285 tests across 18 test suites - All passing ✅**

This project has comprehensive tests for core business logic, API interactions, and command implementations. We focus on testing the critical path and business logic rather than aiming for 100% UI coverage.

## Test Coverage

| Category              | Files                                                                                           | Status                                    |
| --------------------- | ----------------------------------------------------------------------------------------------- | ----------------------------------------- |
| **Core API & Client** | music-assistant-api.test.ts, music-assistant-client.test.ts, api-command.test.ts                | ✅ Fully tested                           |
| **Commands**          | play-pause, next-song, previous-song, volume-up, volume-down, volume-mute, manage-player-groups | ✅ Comprehensive tests                    |
| **Features**          | current-track helpers, music-library-hub (search/browse), shortcuts, player selection           | ✅ All tested                             |
| **Utilities**         | player-list-helpers, volume-validation, interfaces-sync                                         | ✅ All tested                             |
| **UI Components**     | React components (tsx files)                                                                    | 🔸 Minimal - tested through command tests |

## Running Tests

```bash
npm test                    # Run all tests
npm test:watch             # Watch mode
npm run test:coverage      # Coverage report
npm test -- [test-file]    # Run specific test file
```

## What IS Tested

✅ REST API command execution and error handling
✅ All volume control logic (individual, group, clamping)
✅ Player grouping operations (create, disband, member management)
✅ Core client methods (play, pause, next, previous, volume)
✅ Player and queue selection logic
✅ Search and library browsing functionality
✅ Track information and favorites management
✅ Shuffle/repeat mode cycling
✅ Response parsing (null, error fields, edge cases)
✅ Keyboard shortcut parsing and execution
✅ Regression tests for bugs found and fixed

## Regression Tests Added

- Null response handling: Fixed TypeError when `response.json()` returns null
- Undefined player cache: Fixed TypeError when updating volume/mute on non-existent player

## Testing Philosophy

1. **Focus on business logic** - Test what functions do, not implementation details
2. **Test error cases** - What happens when the API fails or returns unusual data?
3. **Test edge cases** - Null values, empty arrays, boundary conditions, group vs individual logic
4. **Use existing patterns** - Look at similar tests as templates
5. **Always test both success and failure scenarios**

## Test Structure

Example test structure:

```typescript
describe("myFeature", () => {
  beforeEach(() => {
    // Setup mocks
  });

  it("should do something in success case", async () => {
    // Arrange: setup mock responses
    mockFetch.mockResolvedValueOnce({...});

    // Act: call the function
    const result = await api.myFeature();

    // Assert: verify the results
    expect(result).toEqual(expected);
  });

  it("should handle errors gracefully", async () => {
    // Setup error condition
    mockFetch.mockRejectedValueOnce(new Error("Network error"));

    // Verify error handling
    await expect(api.myFeature()).rejects.toThrow();
  });
});
```

## CI/CD

Tests run before publishing: `npm run prepublish` (test → lint → build)

All tests must pass before code can be merged.

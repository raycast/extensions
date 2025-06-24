# Testing Guide

## Overview

This project uses [Vitest](https://vitest.dev/) for unit testing. Since Raycast doesn't provide official testing utilities, we've created custom mocks for the Raycast API.

## Running Tests

```bash
# Run tests once
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with UI
npm run test:ui

# Run tests with coverage
npm run test:coverage
```

## Test Structure

```
src/
├── test/
│   ├── setup.ts           # Global test setup
│   └── mocks/
│       ├── raycast-api.ts # Mock for @raycast/api
│       └── raycast-utils.ts # Mock for @raycast/utils
├── utils/
│   └── __tests__/
│       ├── api.test.ts    # Tests for API utilities
│       └── storage.test.ts # Tests for storage utilities
└── hooks/
    └── __tests__/
        └── useFavorites.test.ts # Tests for React hooks
```

## What's Tested

### ✅ Unit Tests
- **API utilities** (`fetchStations`)
  - Successful API calls
  - Error handling
  - Toast notifications
- **Storage utilities** 
  - Favorites management
  - Recently played tracking
  - LocalStorage operations
- **React hooks** (`useFavorites`)
  - State management
  - Side effects

### ⚠️ Not Tested (Complex Dependencies)
- **Player utilities** - Requires mocking Node.js child_process
- **UI Components** - Would require complex Raycast component mocks
- **Commands** - Integration level, better tested manually

## Writing Tests

### Testing Utilities

```typescript
import { describe, it, expect, vi } from 'vitest';
import { showToast } from '@raycast/api';
import { myUtility } from '../myUtility';

describe('myUtility', () => {
  it('should do something', async () => {
    // Arrange
    const mockData = { /* ... */ };
    
    // Act
    const result = await myUtility(mockData);
    
    // Assert
    expect(result).toEqual(expectedResult);
    expect(showToast).toHaveBeenCalledWith(/* ... */);
  });
});
```

### Testing React Hooks

```typescript
import { renderHook, act } from '@testing-library/react';
import { useMyHook } from '../useMyHook';

describe('useMyHook', () => {
  it('should update state', async () => {
    const { result } = renderHook(() => useMyHook());
    
    await act(async () => {
      await result.current.doSomething();
    });
    
    expect(result.current.state).toBe(expected);
  });
});
```

## Mocking Raycast API

The Raycast API is mocked in `src/test/mocks/raycast-api.ts`. Common mocks include:

- `showToast`, `showHUD` - UI notifications
- `LocalStorage` - Persistent storage
- `open`, `closeMainWindow` - System interactions
- Components like `List`, `Grid`, `Action` - UI components

## Best Practices

1. **Test business logic separately** - Extract logic into pure functions when possible
2. **Mock external dependencies** - Don't make real API calls or file system operations
3. **Use TypeScript** - Leverage type safety in tests
4. **Test error cases** - Ensure proper error handling
5. **Keep tests focused** - One concept per test

## Limitations

Since Raycast extensions run in a special environment:
- Can't test actual UI rendering
- Can't test system integrations (opening apps, etc.)
- Manual testing in Raycast development mode is still essential

## Future Improvements

1. Add integration tests using Raycast's development API
2. Increase test coverage for edge cases
3. Add E2E tests if Raycast provides testing utilities
4. Mock more complex Raycast components as needed
# Testing Guide

**Overall Coverage: 61% statements, 56% branches, 29% functions, 62% lines**

_(Note: External code in `src/external-code/` and UI components are excluded from coverage reporting)_

## Coverage Breakdown

| File                          | Coverage | Notes                    |
| ----------------------------- | -------- | ------------------------ |
| api-command.ts                | 100% ✅  | REST API wrapper         |
| music-assistant-client.ts     | 100% ✅  | Core client logic        |
| next-song.tsx, play-pause.tsx | 100% ✅  | Command implementations  |
| use-selected-player-id.ts     | 81% ⚠️   | Some edge cases untested |

## Running Tests

```bash
npm test                    # Run all tests
npm test:watch             # Watch mode
npm run test:coverage      # Coverage report
npm test -- [test-file]    # Run specific test file
```

## What IS Tested

✅ REST API command execution and error handling
✅ Core client methods (play, pause, next, volume)
✅ Player and queue selection logic
✅ Response parsing (null, error fields, edge cases)
✅ Volume clamping (0-100)
✅ Regression tests for bugs found and fixed

## Regression Tests Added

- Null response handling: Fixed TypeError when `response.json()` returns null
- Undefined player cache: Fixed TypeError when updating volume/mute on non-existent player

## Guidelines for New Tests

1. Focus on business logic and error cases
2. Test the underlying function, not thin wrappers
3. Use existing tests as templates
4. Always test both success and failure scenarios

## CI/CD

Tests run before publishing: `npm run prepublish` (test → lint → build)

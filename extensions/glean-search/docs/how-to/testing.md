# Testing

## Running tests

The project uses [Vitest](https://vitest.dev/) for testing.

```bash
# Run all tests once
npm test

# Run tests in watch mode (re-runs on changes)
npm run test:watch
```

## Test structure

Tests live in `src/lib/` alongside the modules they test, following the `*.test.ts` naming convention:

```
src/lib/
  cli.test.ts     -- tests for CLI binary resolution and auto-download
  auth.test.ts    -- tests for OAuth sign-in and auth checks
```

## Writing tests

### Conventions

- Write tests in the same directory as the module under test
- Name test files `moduleName.test.ts`
- Use Vitest's `describe` / `it` / `expect` API
- Mock external dependencies (file system, child process, network) using `vi.mock`

### Example

```typescript
import { describe, it, expect, vi } from "vitest";

describe("resolveGleanCli", () => {
  it("returns null when no binary is found and download fails", async () => {
    // Arrange
    vi.mock("fs", () => ({
      existsSync: vi.fn(() => false),
    }));

    // Act
    const result = await resolveGleanCli();

    // Assert
    expect(result).toBeNull();
  });
});
```

### Mock patterns

The project provides shared mocks in `__mocks__/`:

- `__mocks__/child_process.ts` — mocks `execFile`, `spawn`, `exec`
- `__mocks__/fs.ts` — mocks `existsSync`, `readFileSync`, `writeFileSync`, `mkdirSync`, `chmodSync`, `createWriteStream`
- `__mocks__/@raycast/api.ts` — mocks Raycast API (`environment`, `showToast`, `open`, `Toast`)

Import these in your test to avoid hitting real filesystem or network.

## Running a single test file

```bash
npx vitest run src/lib/cli.test.ts
```

## Coverage

To generate a coverage report:

```bash
npx vitest run --coverage
```

This requires `@vitest/coverage-v8` to be installed.

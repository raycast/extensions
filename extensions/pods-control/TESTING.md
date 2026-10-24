# Testing

How to write and run this extension's Vitest suites.

## Rules

1. One test is one workflow: setup, actions, and the assertions that prove it. Prefer fewer, longer tests.
2. Expected values must not come from the code under test. See [What to assert](#what-to-assert).
3. Each test builds its own state. No `describe`, hooks, or module-level state shared between tests.
4. Write a unit test unless the claim needs a real process or lock. See [Kinds of test](#kinds-of-test).
5. Tests stay offline and in process: no Homebrew, public internet, real device, or Raycast window.
6. No test-only code in production: no `_resetForTests` exports, `NODE_ENV` or `VITEST` branches, or parameters only tests pass. Would production keep it if every test were deleted?
7. Keep the bar high. Do not add a test for a bug that cannot happen again. Coverage finds gaps; it is not a target.

## Writing a test

Use top-level `test` and named `test.each` rows. Names say the condition, the action, and the outcome. Mark each case with `// Given` (fixtures and stubs), `// When` (call the subject), and `// Then` (observable result). Repeat When/Then for a multi-step journey such as install, retry, or disconnect.

```ts
test("returns the Homebrew path when the CLI is there", () => {
  // Given
  stubMachine({ paths: ["/opt/homebrew/bin/pods-control", "/usr/local/bin/pods-control"] });

  // When
  const result = findCliPath();

  // Then
  expect(result).toBe("/opt/homebrew/bin/pods-control");
});
```

Both default locations exist, so reversing the search order fails the test. Asserting `CLI_SEARCH_PATHS[0]` would not.

For an async failure, keep the promise in When and assert `rejects` in Then. Attach the matcher before you advance timers or release a deferred failure.

## Isolation

- Call shared factories from `src/test/` inside the test (`const cli = installedCliSetup()`), never at module level.
- Mocks and stubbed globals reset after every test (`clearMocks`, `mockReset`, `restoreMocks`, `unstubGlobals`), so stub behavior in Given. A bare `vi.fn()` returns `undefined` after a reset. Reset mid-test only between steps of one workflow.
- A factory that owns a resource (a process, temp directory, lock file, fake timers, or rendered view) returns an object with `[Symbol.asyncDispose]` or `[Symbol.dispose]`, and the test declares it with `await using` or `using`, as with `createSupportDirectory()`, `createFakeCli()`, and `fakeTimers()`. Plain fixtures do not need one.
- Other cleanup, such as stopping a process between two When steps, uses `try/finally` or `onTestFinished`, registered as soon as you acquire the resource.
- Await pending installer prompts, Homebrew operations, and child processes before restoring timers or deleting directories, even after a failed assertion. No disposable owns the installer's module-level pending promises, and clearing mocks does not clear them.
- `setupFiles` may verify mocks or logs, as `src/test/console.ts` does, but must not plant scenario state.

## What to assert

Assert what a caller or user observes: CLI arguments, confirmed states, toasts and their actions, copied text, opened URLs, launched commands, subtitles, lock ownership, exit codes, and `CliError` fields. Click actions and check where they lead. Write expected values as literals, not production constants such as `CLI_INSTALL_COMMAND`.

```ts
expect(compareVersions(version, version)).toBe(0); // no: cannot fail
expect(normalizeVersion(" v0.05.0 ")).toBe("0.5.0"); // yes: fails if parsing breaks
```

Do not assert:

- A production helper on both sides, or a predicate on the constant it looks up.
- An exported constant against its own literal.
- Instructional copy: setup guidance, toast messages, preference descriptions, tooltips, HUD text.
- Absence of something no code path can produce, such as a deleted action. Assert absence only where a live path could still show it: loading vs ready, connected vs not connected.
- What TypeScript already enforces. Launch context still needs runtime checks.

Logs are part of the contract. Any `console.error` or `console.warn` you have not declared fails the test. Declare each one with `expectConsoleError(tag, error)` or `expectConsoleWarning(tag, error)`, passing the stable tag and the error object production logs.

## Kinds of test

| Kind        | Files                                                                                      | Use when                                                               | Avoid when                              |
| ----------- | ------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------- | --------------------------------------- |
| Unit        | `src/**/*.test.ts`, `src/**/*.test.tsx`                                                    | One module's logic or view, with Raycast, the CLI, and the OS stubbed. | The claim needs a real process or lock. |
| Integration | `src/test/integration/**/*.integration.test.ts`, `src/test/integration/**/*.macos.test.ts` | Composed modules talking to fake CLI and supervisor processes.         | A unit test can falsify the claim.      |

The file name picks how a test runs:

- `.test.ts` runs in Node. `.test.tsx` runs in happy-dom so it can render views; it still cannot prove native Raycast rendering or HUD fallback.
- `.macos.test.ts` is for integration tests that need real `lockf`, file descriptors, or revision files. Every case uses `test.skipIf(process.platform !== "darwin")`. Do not stub `lockf`, cut timeouts, or turn off file isolation to speed it up.

Real devices, native Raycast rendering, HUD fallback, and a real `brew install` are checked manually.

Run one kind with `npm run test:unit` or `npm run test:integration`, or one file by its path:

```sh
npx --no-install vitest run src/cli/client.test.ts
```

## Before you finish

```sh
npm test
npm run type-check
npm run lint
npx --no-install prettier --check src .prettierrc eslint.config.js package.json tsconfig.json vitest.config.ts
npm run build
```

After isolation changes, also run `npx --no-install vitest run --sequence.shuffle --sequence.seed <n>` and record the seed.

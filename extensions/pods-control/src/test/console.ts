import { beforeEach, expect, onTestFinished, vi } from "vitest";

let errors: unknown[][];
let warnings: unknown[][];
let expectedErrors: unknown[][];
let expectedWarnings: unknown[][];

// Runner infrastructure owns these spies; scenarios register exact expected calls.
beforeEach(() => {
  errors = [];
  warnings = [];
  expectedErrors = [];
  expectedWarnings = [];
  vi.spyOn(console, "error").mockImplementation((...args) => {
    errors.push(args);
  });
  vi.spyOn(console, "warn").mockImplementation((...args) => {
    warnings.push(args);
  });
  // `using` fixtures dispose when the test body ends, and onTestFinished runs in reverse order, so cleanup runs before this check.
  onTestFinished(() => {
    try {
      expect(errors, "console.error calls must match the errors declared by this scenario").toEqual(expectedErrors);
      expect(warnings, "console.warn calls must match the warnings declared by this scenario").toEqual(
        expectedWarnings,
      );
    } finally {
      vi.mocked(console.error).mockRestore();
      vi.mocked(console.warn).mockRestore();
    }
  });
});

export function expectConsoleError(tag: string, error: unknown) {
  expectedErrors.push([tag, error]);
}

export function expectConsoleWarning(tag: string, error: unknown) {
  expectedWarnings.push([tag, error]);
}

/**
 * `@raycast/api` ships types only — its runtime is injected by Raycast at build
 * time, so the module cannot be resolved under Vitest. This stub stands in for
 * it (see `vitest.config.ts`) so pure helpers that happen to read a preference
 * stay unit-testable.
 *
 * Only the members the tested helpers actually touch are implemented. Tests
 * that care about preference values should pass them explicitly instead of
 * relying on this default.
 */
export function getPreferenceValues<T>(): T {
  return {} as T;
}

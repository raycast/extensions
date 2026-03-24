/* eslint-disable @typescript-eslint/no-unused-vars */
// Mock for @raycast/utils — used by vitest to prevent resolution failures
export function useCachedPromise<T>(
  fn: () => Promise<T>,
  _args?: unknown[],
  _options?: unknown,
): { data: T | undefined; isLoading: boolean; error: unknown } {
  return { data: undefined, isLoading: false, error: undefined };
}

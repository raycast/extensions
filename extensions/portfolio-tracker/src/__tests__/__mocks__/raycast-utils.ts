/* eslint-disable @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any */
/**
 * Mock for @raycast/utils module.
 *
 * Provides lightweight stubs for the utility hooks and functions used
 * across the codebase so that service-layer and utility tests can run
 * in a plain Node/Jest environment without the real Raycast runtime.
 *
 * Only the APIs actually imported by non-UI code need to be mocked here.
 * The primary export used in our hooks is `useCachedPromise`.
 */

// ──────────────────────────────────────────
// useCachedPromise
// ──────────────────────────────────────────

/**
 * Minimal mock of `useCachedPromise` from @raycast/utils.
 *
 * In the real Raycast environment, this hook:
 * - Calls the async function with the provided arguments
 * - Caches the result across renders
 * - Returns { data, isLoading, error, revalidate, mutate }
 *
 * In the test environment, we return a static object. Tests that
 * need to exercise hook behaviour should use the services and
 * utilities directly rather than going through React hooks.
 */
export function useCachedPromise<T>(
  _fn: (...args: any[]) => Promise<T>,
  _args?: any[],
  _options?: {
    execute?: boolean;
    keepPreviousData?: boolean;
    initialData?: T;
    onData?: (data: T) => void;
    onError?: (error: Error) => void;
    onWillExecute?: () => void;
  },
): {
  data: T | undefined;
  isLoading: boolean;
  error: Error | undefined;
  revalidate: () => void;
  mutate: (
    asyncUpdate?: Promise<T>,
    options?: { optimisticUpdate?: (data: T | undefined) => T | undefined },
  ) => Promise<T | undefined>;
} {
  const initialData = _options?.initialData;

  return {
    data: initialData,
    isLoading: false,
    error: undefined,
    revalidate: () => {},
    mutate: async (asyncUpdate) => {
      if (asyncUpdate) {
        return await asyncUpdate;
      }
      return initialData;
    },
  };
}

// ──────────────────────────────────────────
// usePromise
// ──────────────────────────────────────────

/**
 * Minimal mock of `usePromise` from @raycast/utils.
 *
 * Similar to useCachedPromise but without caching.
 * Returns a static object for test compatibility.
 */
export function usePromise<T>(
  _fn: (...args: any[]) => Promise<T>,
  _args?: any[],
  _options?: {
    execute?: boolean;
    onData?: (data: T) => void;
    onError?: (error: Error) => void;
    onWillExecute?: () => void;
  },
): {
  data: T | undefined;
  isLoading: boolean;
  error: Error | undefined;
  revalidate: () => void;
  mutate: (
    asyncUpdate?: Promise<T>,
    options?: { optimisticUpdate?: (data: T | undefined) => T | undefined },
  ) => Promise<T | undefined>;
} {
  return {
    data: undefined,
    isLoading: false,
    error: undefined,
    revalidate: () => {},
    mutate: async (asyncUpdate) => {
      if (asyncUpdate) {
        return await asyncUpdate;
      }
      return undefined;
    },
  };
}

// ──────────────────────────────────────────
// useFetch
// ──────────────────────────────────────────

/**
 * Minimal mock of `useFetch` from @raycast/utils.
 *
 * Returns a static "not loaded" state. Not used directly in our
 * codebase but mocked here for completeness in case any transitive
 * import references it.
 */
export function useFetch<T>(
  _url: string,
  _options?: Record<string, unknown>,
): {
  data: T | undefined;
  isLoading: boolean;
  error: Error | undefined;
  revalidate: () => void;
} {
  return {
    data: undefined,
    isLoading: false,
    error: undefined,
    revalidate: () => {},
  };
}

// ──────────────────────────────────────────
// useLocalStorage (if used)
// ──────────────────────────────────────────

/**
 * Minimal mock of `useLocalStorage` from @raycast/utils.
 *
 * Returns initial value and a no-op setter.
 */
export function useLocalStorage<T>(
  _key: string,
  initialValue?: T,
): {
  value: T | undefined;
  setValue: (value: T) => Promise<void>;
  removeValue: () => Promise<void>;
  isLoading: boolean;
} {
  return {
    value: initialValue,
    setValue: async () => {},
    removeValue: async () => {},
    isLoading: false,
  };
}

// ──────────────────────────────────────────
// showFailureToast
// ──────────────────────────────────────────

/**
 * Mock for the `showFailureToast` utility.
 * Silent no-op in tests.
 */
export async function showFailureToast(
  _error: unknown,
  _options?: { title?: string; message?: string },
): Promise<void> {
  // No-op in test environment
}

// ──────────────────────────────────────────
// runAppleScript (macOS-specific, stubbed)
// ──────────────────────────────────────────

/**
 * Mock for `runAppleScript`. Returns empty string.
 */
export async function runAppleScript(_script: string): Promise<string> {
  return "";
}

// ──────────────────────────────────────────
// getFavicon
// ──────────────────────────────────────────

/**
 * Mock for `getFavicon`. Returns a placeholder URL string.
 */
export function getFavicon(_url: string, _options?: { fallback?: string }): string {
  return "https://placeholder.test/favicon.png";
}

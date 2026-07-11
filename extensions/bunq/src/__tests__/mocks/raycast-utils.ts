/**
 * Mock implementation of @raycast/utils for testing.
 */

import { vi } from "vitest";

interface PromiseResult<T> {
  data: T | undefined;
  isLoading: boolean;
  error: Error | undefined;
  revalidate: () => void;
}

/**
 * Mock usePromise hook that returns data immediately.
 */
export const usePromise = vi.fn(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (...args: any[]): PromiseResult<unknown> => {
    void args; // Suppress unused warning
    return {
      data: undefined,
      isLoading: false,
      error: undefined,
      revalidate: vi.fn(),
    };
  },
);

/**
 * Mock useCachedPromise hook.
 */
export const useCachedPromise = vi.fn(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (...args: any[]): PromiseResult<unknown> => {
    const options = args[2] as { initialData?: unknown } | undefined;
    return {
      data: options?.initialData,
      isLoading: false,
      error: undefined,
      revalidate: vi.fn(),
    };
  },
);

/**
 * Mock useFetch hook.
 */
export const useFetch = vi.fn(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (...args: any[]): PromiseResult<unknown> => {
    void args; // Suppress unused warning
    return {
      data: undefined,
      isLoading: false,
      error: undefined,
      revalidate: vi.fn(),
    };
  },
);

/**
 * Mock useForm hook.
 */
export const useForm = vi.fn(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (...args: any[]) => {
    void args; // Suppress unused warning
    return {
      handleSubmit: vi.fn((fn: (values: Record<string, unknown>) => void) => fn),
      itemProps: {},
      values: {} as Record<string, unknown>,
      setValue: vi.fn(),
      reset: vi.fn(),
      focus: vi.fn(),
    };
  },
);

/**
 * Mock showFailureToast utility.
 */
export const showFailureToast = vi.fn(() => Promise.resolve());

/**
 * Mock getAvatarIcon utility.
 */
export const getAvatarIcon = vi.fn((name: string) => ({
  source: `avatar-${name}`,
}));

/**
 * Mock getFavicon utility.
 */
export const getFavicon = vi.fn((url: string) => ({
  source: `favicon-${url}`,
}));

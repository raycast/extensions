/**
 * Mock for @raycast/utils.
 */

export const useCachedPromise = jest.fn(
  <T>(
    fn: (...args: unknown[]) => Promise<T>,
    args: unknown[],
    _options?: unknown
  ) => {
    // By default return a no-op loading state.
    // Individual tests should call `.mockReturnValue(...)` to simulate data.
    return { data: undefined, isLoading: false, error: undefined, revalidate: jest.fn() };
  }
);

export const useFetch = jest.fn(() => ({
  data: undefined,
  isLoading: false,
  error: undefined,
  revalidate: jest.fn(),
}));

export const usePromise = jest.fn(() => ({
  data: undefined,
  isLoading: false,
  error: undefined,
}));

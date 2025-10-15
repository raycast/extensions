// Mock for @raycast/utils
export const useCachedState = jest.fn((key: string, defaultValue: unknown) => [
  defaultValue,
  jest.fn(),
]);
export const useCachedPromise = jest.fn();
export const usePromise = jest.fn();
export const useFetch = jest.fn();

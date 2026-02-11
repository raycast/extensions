// This mocks the Raycast Utils hook so tests don't crash
export function useLocalStorage<T>(key: string, initialValue: T) {
  return {
    value: initialValue,
    setValue: jest.fn(),
    isLoading: false,
  };
}

export function useFetch<T>() {
  return {
    isLoading: false,
    data: null as T | null,
    revalidate: jest.fn(),
    error: null,
  };
}

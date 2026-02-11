// This mocks the Raycast Utils hook so tests don't crash
export function useLocalStorage(key: string, initialValue: any) {
  return {
    value: initialValue,
    setValue: jest.fn(),
    isLoading: false,
  };
}

export function useFetch(url: string, options: any) {
  return {
    isLoading: false,
    data: null,
    revalidate: jest.fn(),
    error: null,
  };
}
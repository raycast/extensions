export function useLocalStorage<T>(key: string, initialValue: T) {
  return [initialValue, jest.fn()];
}

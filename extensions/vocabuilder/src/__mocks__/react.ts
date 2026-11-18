export function useEffect() {
  // no-op for in-source tests that import TSX modules without rendering them
}

export function useRef<T>(value: T) {
  return { current: value };
}

export function useReducer<S>(_: unknown, initialState: S) {
  return [initialState, () => undefined] as const;
}

export function useState<T>(value: T | (() => T)) {
  const initialValue = typeof value === "function" ? (value as () => T)() : value;
  return [initialValue, () => undefined] as const;
}

export function useCallback<T>(callback: T) {
  return callback;
}

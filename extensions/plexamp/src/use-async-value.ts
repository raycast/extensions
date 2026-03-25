import { useCallback, useEffect, useRef, useState } from "react";

interface AsyncValueState<T> {
  isLoading: boolean;
  value: T;
  error?: string;
}

export function useAsyncValue<T>(loader: () => Promise<T>, dependencyKey: string, initialValue: T) {
  const [state, setState] = useState<AsyncValueState<T>>({
    isLoading: true,
    value: initialValue,
  });
  const loaderRef = useRef(loader);
  const initialValueRef = useRef(initialValue);
  const requestIdRef = useRef(0);

  loaderRef.current = loader;
  initialValueRef.current = initialValue;

  const reload = useCallback(async () => {
    const requestId = ++requestIdRef.current;

    setState({
      isLoading: true,
      value: initialValueRef.current,
      error: undefined,
    });

    try {
      const value = await loaderRef.current();

      if (requestId !== requestIdRef.current) {
        return;
      }

      setState({
        isLoading: false,
        value,
      });
    } catch (error) {
      if (requestId !== requestIdRef.current) {
        return;
      }

      setState({
        isLoading: false,
        value: initialValueRef.current,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }, []);

  useEffect(() => {
    void reload();

    return () => {
      requestIdRef.current += 1;
    };
  }, [dependencyKey, reload]);

  return {
    ...state,
    reload,
  };
}

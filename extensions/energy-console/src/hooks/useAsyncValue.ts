import { useCallback, useEffect, useRef, useState } from "react";

export interface AsyncValue<T> {
  data: T | undefined;
  error: Error | undefined;
  isLoading: boolean;
  revalidate(): Promise<void>;
}

export function useAsyncValue<T>(load: () => Promise<T>): AsyncValue<T> {
  const loadRef = useRef(load);
  loadRef.current = load;
  const generation = useRef(0);
  const [state, setState] = useState<{ data: T | undefined; error: Error | undefined; isLoading: boolean }>({
    data: undefined,
    error: undefined,
    isLoading: true,
  });

  const revalidate = useCallback(async () => {
    const currentGeneration = generation.current + 1;
    generation.current = currentGeneration;
    setState((current) => ({ data: current.data, error: undefined, isLoading: true }));

    try {
      const data = await loadRef.current();
      if (generation.current === currentGeneration) setState({ data, error: undefined, isLoading: false });
    } catch (error) {
      if (generation.current === currentGeneration) {
        setState((current) => ({
          data: current.data,
          error: error instanceof Error ? error : new Error("The request failed."),
          isLoading: false,
        }));
      }
    }
  }, []);

  useEffect(() => {
    void revalidate();
    return () => {
      generation.current += 1;
    };
  }, [revalidate, load]);

  return { ...state, revalidate };
}

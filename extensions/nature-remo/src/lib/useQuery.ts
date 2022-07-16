import { showToast, Toast } from "@raycast/api";
import { AbortError } from "node-fetch";
import { useCallback, useEffect, useRef, useState } from "react";

export type Fetcher<R> = (signal: AbortSignal) => Promise<R>;

export function useQuery<R>(fetcher: Fetcher<R>, deps: React.DependencyList = []) {
  const [state, setState] = useState<{ data: R | null; isLoading: boolean }>({ data: null, isLoading: true });
  const cancelRef = useRef<AbortController | null>(null);
  const perform = useCallback(
    async function perform() {
      cancelRef.current?.abort();
      cancelRef.current = new AbortController();

      setState((oldState) => ({
        ...oldState,
        isLoading: true,
      }));

      try {
        const data: R = await fetcher(cancelRef.current.signal);

        setState((oldState) => ({
          ...oldState,
          data,
          isLoading: false,
        }));
      } catch (error) {
        setState((oldState) => ({
          ...oldState,
          isLoading: false,
        }));

        if (error instanceof AbortError) {
          return;
        }

        console.error("API error:", error);

        showToast({ style: Toast.Style.Failure, title: "API request failed", message: String(error) });
      }
    },
    [cancelRef, setState, fetcher]
  );

  useEffect(() => {
    perform();

    return () => {
      cancelRef.current?.abort();
    };
  }, deps);

  const { isLoading, data } = state;

  return {
    isLoading,
    data,
  };
}

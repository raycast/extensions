import { showToast, Toast } from "@raycast/api";
import { AbortError } from "node-fetch";
import { useCallback, useEffect, useRef, useState } from "react";
import { performGetActivity } from "./activity";
import { performListFavorites, performSearch } from "./files";

type Fetcher<A, R> = (args: { signal: AbortSignal; args?: A }) => Promise<R>;

export function useActivity() {
  const {
    state: { results, isLoading },
    perform: getActivity,
  } = useQuery(({ signal }) => {
    return performGetActivity(signal);
  });
  return { activity: results ?? [], isLoading, getActivity };
}

export function useFavorites() {
  const {
    state: { results, isLoading },
    perform: getFavorites,
  } = useQuery(({ signal }) => {
    return performListFavorites(signal);
  });
  return { favorites: results ?? [], isLoading, getFavorites };
}

export function useSearch() {
  const {
    state: { results, isLoading },
    perform: search,
  } = useQuery(async ({ signal, args }: { signal: AbortSignal; args?: string }) => {
    return performSearch(signal, args);
  });
  return { results: results ?? [], isLoading, search };
}

function useQuery<A, R>(fetcher: Fetcher<A, R>) {
  const [state, setState] = useState<{ results: R | null; isLoading: boolean }>({ results: null, isLoading: true });
  const cancelRef = useRef<AbortController | null>(null);

  const perform = useCallback(
    async function perform(args?: A) {
      cancelRef.current?.abort();
      cancelRef.current = new AbortController();
      setState((oldState) => ({
        ...oldState,
        isLoading: true,
      }));
      try {
        const results = await fetcher({ signal: cancelRef.current.signal, args });
        setState((oldState) => ({
          ...oldState,
          results,
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
    [cancelRef, setState]
  );

  useEffect(() => {
    perform();
    return () => {
      cancelRef.current?.abort();
    };
  }, []);

  return {
    state,
    perform,
  };
}

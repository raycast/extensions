import { showToast, Toast } from "@raycast/api";
import { AbortError } from "node-fetch";
import { useEffect, useRef, useState } from "react";
import { Emote } from "../components/emote";
import { performSearch } from "../api/bttv_api";

export function useSearch() {
  const [state, setState] = useState<SearchState>({ results: [], isLoading: true });
  const cancelRef = useRef<AbortController | null>(null);

  useEffect(() => {
    search("");
    return () => {
      cancelRef.current?.abort();
    };
  }, []);

  async function search(searchText: string) {
    if (searchText.length < 2) {
      setState((oldState) => ({
        ...oldState,
        results: [],
        isLoading: false,
      }));
      return;
    }
    cancelRef.current?.abort();
    cancelRef.current = new AbortController();

    try {
      setState((oldState) => ({
        ...oldState,
        isLoading: true,
      }));

      const results = await performSearch(searchText, cancelRef.current.signal);

      setState((oldState) => ({
        ...oldState,
        results: results,
        isLoading: false,
      }));
    } catch (error) {
      if (error instanceof AbortError) {
        return;
      }
      showToast(Toast.Style.Failure, "Error", "Emote not found");
    }
  }

  return {
    state: state,
    search: search,
  };
}

interface SearchState {
  results: Emote[];
  isLoading: boolean;
}

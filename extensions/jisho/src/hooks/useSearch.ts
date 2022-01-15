import { randomId, showToast, ToastStyle } from "@raycast/api";
import fetch, { AbortError } from "node-fetch";
import { useState, useEffect, useRef } from "react";
import { SearchState, SearchResult } from "../types/types";

const useSearch = () => {
  const [state, setState] = useState<SearchState>({ results: [], isLoading: true });
  const cancelRef = useRef<AbortController | null>(null);

  useEffect(() => {
    search("");
    return () => {
      cancelRef.current?.abort();
    };
  }, []);

  async function search(searchText: string) {
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
      console.error("search error", error);
      showToast(ToastStyle.Failure, "Could not perform search", String(error));
    }
  }

  return {
    state: state,
    search: search,
  };
};

async function performSearch(searchText: string, signal: AbortSignal): Promise<SearchResult[]> {
  const response = await fetch(`https://jisho.org/api/v1/search/words?keyword=${searchText}`, {
    method: "get",
    signal: signal,
  });

  if (!response.ok) {
    return Promise.reject(response.statusText);
  }

  type Json = Record<string, unknown>;

  const json = (await response.json()) as Json;
  const results = (json?.data as Json[]) ?? [];

  return results.map((word) => {
    return {
      id: randomId(),
      slug: (word?.slug as string) ?? "",
      kanji: ((word?.japanese as Json[])[0]?.word as string) ?? "",
      reading: ((word?.japanese as Json[])[0]?.reading as string) ?? "",
      definition: ((word?.senses as Json[])[0]?.english_definitions as [string]) ?? [],
      url: `https://jisho.org/word/${word.slug}` as string,
    };
  });
}

export default useSearch;

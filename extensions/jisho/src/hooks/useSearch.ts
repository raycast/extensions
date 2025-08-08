import { showToast, Toast } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { nanoid } from "nanoid";
import { useState, useCallback } from "react";

import { SearchResult } from "../types/types";

type Json = Record<string, unknown>;

const useSearch = (initialSearchText: string) => {
  const [searchText, setSearchText] = useState<string>(initialSearchText);

  const { isLoading, data } = useFetch(
    `https://jisho.org/api/v1/search/words?keyword=${encodeURIComponent(searchText)}`,
    {
      headers: {
        "User-Agent": "Raycast Jisho Extension",
      },
      parseResponse: parseResponse,
      initialData: [],
      keepPreviousData: false,
      execute: !!searchText.trim(),
      onError: (error) => {
        console.error("search error", error);
        showToast({
          style: Toast.Style.Failure,
          title: "Could not perform search",
          message: String(error),
        });
      },
    }
  );

  // Use a stable callback for setSearchText
  const setSearchTextCallback = useCallback((text: string) => {
    setSearchText(text.trim());
  }, []);

  return {
    state: {
      isLoading,
      results: data || [],
    },
    setSearchText: setSearchTextCallback,
    searchText,
  };
};

async function parseResponse(response: Response): Promise<SearchResult[]> {
  if (!response.ok) {
    throw new Error(`API request failed with status ${response.status}`);
  }

  const json = (await response.json()) as Json;
  const results = (json?.data as Json[]) ?? [];

  return results.map((word) => {
    const japanese = word?.japanese as Json[] || [];
    const senses = word?.senses as Json[] || [];
    
    return {
      id: nanoid(),
      slug: (word?.slug as string) ?? "",
      kanji: (japanese[0]?.word as string) ?? "",
      reading: (japanese[0]?.reading as string) ?? "",
      definition: (senses[0]?.english_definitions as [string]) ?? [],
      url: `https://jisho.org/word/${word.slug}` as string,
    };
  });
}

export default useSearch;

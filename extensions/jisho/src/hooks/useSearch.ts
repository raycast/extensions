import { showToast, Toast } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { nanoid } from "nanoid";
import { useState } from "react";

import { SearchResult } from "../types/types";

type Json = Record<string, unknown>;

const useSearch = (initialSearchText: string) => {
  const [searchText, setSearchText] = useState<string>(initialSearchText);

  const { isLoading, data } = useFetch(`https://jisho.org/api/v1/search/words?keyword=${searchText}`, {
    headers: {
      "User-Agent": "Raycast Jisho Extension",
    },
    parseResponse: parseResponse,
    initialData: [],
    keepPreviousData: true,
    onError: (error) => {
      console.error("search error", error);
      showToast({
        style: Toast.Style.Failure,
        title: "Could not perform search",
        message: String(error),
      });
    },
  });

  return {
    state: {
      isLoading,
      results: data,
    },
    setSearchText,
    searchText,
  };
};

async function parseResponse(response: Response) {
  const json = (await response.json()) as Json;
  const results = (json?.data as Json[]) ?? [];

  return results.map((word) => {
    return <SearchResult>{
      id: nanoid(),
      slug: (word?.slug as string) ?? "",
      kanji: ((word?.japanese as Json[])[0]?.word as string) ?? "",
      reading: ((word?.japanese as Json[])[0]?.reading as string) ?? "",
      definition: ((word?.senses as Json[])[0]?.english_definitions as [string]) ?? [],
      url: `https://jisho.org/word/${word.slug}` as string,
    };
  });
}

export default useSearch;

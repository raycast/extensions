import { List, showToast, ToastStyle } from "@raycast/api";
import fetch, { AbortError } from "node-fetch";
import { useEffect, useRef, useState } from "react";
import { Emote } from "./components/emote";
import { SearchListItem } from "./components/search_list_item";

export default function Command() {
  const { state, search } = useSearch();

  return (
    <List isLoading={state.isLoading} onSearchTextChange={search} searchBarPlaceholder="Search by name..." throttle>
      <List.Section title="Results" subtitle={state.results.length + ""}>
        {state.results.map((searchResult) => (
          <SearchListItem key={searchResult.id} searchResult={searchResult} />
        ))}
      </List.Section>
    </List>
  );
}

function useSearch() {
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
      showToast(ToastStyle.Failure, "Error", "Emote not found");
    }
  }

  return {
    state: state,
    search: search,
  };
}

async function performSearch(searchText: string, signal: AbortSignal): Promise<Emote[]> {
  const params = new URLSearchParams();
  const blankQuery = "    ";
  params.append("query", searchText.length > 2 ? searchText : blankQuery);
  params.append("offset", "0");
  params.append("limit", "20");

  const response = await fetch("https://api.betterttv.net/3/emotes/shared/search" + "?" + params.toString(), {
    method: "get",
    signal: signal,
  });

  if (!response.ok) {
    return Promise.reject(response.statusText);
  }

  type Json = Record<string, unknown>;
  const json = (await response.json()) as Json;
  const jsonResults = (json as unknown as Json[]) ?? [];
  return jsonResults.map((jsonResult) => {
    const emoteJson = jsonResult as Json;
    return {
      id: emoteJson.id as string,
      code: emoteJson.code as string,
      imageType: emoteJson.imageType as string,
    };
  });
}

interface SearchState {
  results: Emote[];
  isLoading: boolean;
}

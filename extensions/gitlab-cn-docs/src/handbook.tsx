import { ActionPanel, Action, List, showToast, Toast } from "@raycast/api";
import { useState, useEffect, useRef, useCallback } from "react";
import fetch, { AbortError } from "node-fetch";
import { LocalStorage } from "@raycast/api";

const apiUrl =
  "https://15g8rvpi17-3.algolianet.com/1/indexes/*/queries?x-algolia-application-id=15G8RVPI17&x-algolia-api-key=9d47b05e997031f6ab734e3fd653ac75";

export default function Command() {
  const { state, search } = useSearch();

  return (
    <List isLoading={state.isLoading} onSearchTextChange={search} searchBarPlaceholder="搜索极狐 Handbook..." throttle>
      <List.Section title="结果" subtitle={state.results.length + ""}>
        {state.results.map((searchResult, index) => (
          <SearchListItem key={index} searchResult={searchResult} />
        ))}
      </List.Section>
    </List>
  );
}

function SearchListItem({ searchResult }: { searchResult: SearchResult }) {
  return (
    <List.Item
      icon="handbook-icon.png"
      title={searchResult.name}
      subtitle={searchResult.description}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser url={encodeURI(searchResult.url)} />
        </ActionPanel>
      }
    />
  );
}

function useSearch() {
  const [state, setState] = useState<SearchState>({ results: [], isLoading: true });
  const cancelRef = useRef<AbortController | null>(null);

  const search = useCallback(
    async function search(searchText: string) {
      cancelRef.current?.abort();
      cancelRef.current = new AbortController();
      setState((oldState) => ({
        ...oldState,
        isLoading: true,
      }));
      try {
        const results = await performSearch(searchText, cancelRef.current.signal);
        setState((oldState) => ({
          ...oldState,
          results: results,
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

        console.error("search error", error);
        showToast({ style: Toast.Style.Failure, title: "Could not perform search", message: String(error) });
      }
    },
    [cancelRef, setState]
  );

  useEffect(() => {
    search("");
    return () => {
      cancelRef.current?.abort();
    };
  }, []);

  return {
    state: state,
    search: search,
  };
}

async function performSearch(searchText: string, signal: AbortSignal): Promise<SearchResult[]> {
  const lastSearchText: string = (await LocalStorage.getItem("JiHuHandbook.lastSearch")) || "";

  const data = {
    requests: [
      {
        query: searchText.length > 0 ? searchText : lastSearchText,
        indexName: "jihu-handbook",
        params: "attributesToRetrieve=content,type,url,hierarchy.lvl0,hierarchy.lvl1,hierarchy.lvl2",
        hitsPerPage: 99,
      },
    ],
  };
  const response = await fetch(apiUrl, {
    method: "post",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
    signal: signal as any,
  });

  const json = (await response.json()) as
    | {
        results: {
          hits: Array<Parameters>;
        }[];
      }
    | { code: string; message: string };

  if (!response.ok || "message" in json) {
    throw new Error("message" in json ? json.message : response.statusText);
  }

  if (searchText.length > 0 && searchText !== lastSearchText) {
    await LocalStorage.setItem("JiHuHandbook.lastSearch", searchText);
  }

  return json.results[0].hits
    .filter((result) => result.hierarchy.lvl2 || result.hierarchy.lvl0)
    .map((result) => {
      return {
        name: result.hierarchy.lvl2 || result.hierarchy.lvl0,
        description: result._snippetResult ? result._snippetResult.content.value : "",
        url: result.url,
      };
    });
}

interface Parameters {
  hierarchy: {
    lvl0: string;
    lvl2: string;
  };
  _snippetResult: {
    content: {
      value: string;
    };
  };
  url: string;
}

interface SearchState {
  results: SearchResult[];
  isLoading: boolean;
}

interface SearchResult {
  name: string;
  description?: string;
  url: string;
}

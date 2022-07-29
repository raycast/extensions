import { ActionPanel, Action, List, showToast, Toast } from "@raycast/api";
import { useState, useEffect, useRef, useCallback } from "react";
import fetch, { AbortError } from "node-fetch";
import { LocalStorage } from "@raycast/api";

const apiUrl =
  "https://3pncfou757-dsn.algolia.net/1/indexes/*/queries?x-algolia-api-key=89b85ffae982a7f1adeeed4a90bb0ab1&x-algolia-application-id=3PNCFOU757";

export default function Command() {
  const { state, search } = useSearch();

  return (
    <List isLoading={state.isLoading} onSearchTextChange={search} searchBarPlaceholder="Search GitLab Docs..." throttle>
      <List.Section title="Results" subtitle={state.results.length + ""}>
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
      icon="docs-icon.png"
      title={searchResult.name}
      subtitle={searchResult.description}
      accessoryTitle={searchResult.category}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser url={searchResult.url} />
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
  const lastSearchText: string = (await LocalStorage.getItem("GitLabDocs.lastSearch")) || "";

  const data = {
    requests: [
      {
        query: searchText.length > 0 ? searchText : lastSearchText,
        indexName: "gitlab",
        params: "attributesToRetrieve=content,type,url,hierarchy.lvl0,hierarchy.lvl1,hierarchy.lvl2",
        hitsPerPage: 99,
        facetFilters: ["version:main"],
      },
    ],
  };
  const response = await fetch(apiUrl, {
    method: "post",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
    signal: signal,
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
    await LocalStorage.setItem("GitLabDocs.lastSearch", searchText);
  }

  return json.results[0].hits.map((result) => {
    return {
      name: result.hierarchy.lvl2 ? result.hierarchy.lvl2 : result.hierarchy.lvl0,
      description: result._snippetResult ? result._snippetResult.content.value : "",
      category: result.hierarchy.lvl2 ? result.hierarchy.lvl0 : "",
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
  category?: string;
  url: string;
}

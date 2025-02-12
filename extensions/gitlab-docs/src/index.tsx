import { ActionPanel, Action, List, showToast, Toast } from "@raycast/api";
import { useState, useEffect, useRef, useCallback } from "react";
import fetch, { AbortError } from "node-fetch";
import { LocalStorage } from "@raycast/api";

const apiUrl = "https://search-api.swiftype.com/api/v1/public/installs/DTF81Pizm7yGQpgXcrMP/search.json";

export default function Command() {
  const { state, search } = useSearch();

  return (
    <List
      isLoading={state.isLoading}
      onSearchTextChange={search}
      searchBarPlaceholder="Search GitLab Handbook..."
      throttle
    >
      <List.Section title="Results" subtitle={state.records.length + ""}>
        {state.records.map((searchResult, index) => (
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
      subtitle={searchResult.category}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser url={searchResult.url} />
        </ActionPanel>
      }
    />
  );
}

function useSearch() {
  const [state, setState] = useState<SearchState>({ records: [], isLoading: true });
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
        const records = await performSearch(searchText, cancelRef.current.signal);
        setState((oldState) => ({
          ...oldState,
          records: records,
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
  const lastSearchText: string = (await LocalStorage.getItem("GitLabHandbook.lastSearch")) || "about gitlab";
  const params = new URLSearchParams();
  params.append("q", searchText.length >= 3 ? searchText : lastSearchText);

  const response = await fetch(apiUrl + "?" + params.toString(), {
    method: "get",
    signal: signal,
  });

  const json = (await response.json()) as
    | {
        records: {
          page: Array<Parameters>;
        };
      }
    | { code: string; message: string };

  if (!response.ok || "message" in json) {
    throw new Error("message" in json ? json.message : response.statusText);
  }

  if (searchText.length > 0 && searchText !== lastSearchText) {
    await LocalStorage.setItem("GitLabHandbook.lastSearch", searchText);
  }

  return json.records.page.map((result) => {
    return {
      name: result.sections[0],
      category: `${result.sections[3]}: ${result.sections[4]}, ${result.sections[5]}, ${result.sections[6]}, ${result.sections[7]}, ${result.sections[8]}, ...`,
      url: result.url,
    };
  });
}

interface Parameters {
  title: string;
  body: string;
  sections: string;
  url: string;
}

interface SearchState {
  records: SearchResult[];
  isLoading: boolean;
}

interface SearchResult {
  name: string;
  category?: string;
  url: string;
}

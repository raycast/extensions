import { ActionPanel, Action, List, showToast, Toast } from "@raycast/api";
import { useState, useEffect, useRef, useCallback } from "react";
import fetch, { AbortError } from "node-fetch";

const apiUrl = "https://search-api.swiftype.com/api/v1/public/installs/DTF81Pizm7yGQpgXcrMP/suggest.json";

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
      icon="../assets/handbook-icon.png"
      title={searchResult.name}
      accessoryTitle={searchResult.category}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.OpenInBrowser title="Show Details" url={searchResult.url} />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action.CopyToClipboard
              title="Copy Install Command"
              content={`npm install ${searchResult.name}`}
              shortcut={{ modifiers: ["cmd"], key: "." }}
            />
          </ActionPanel.Section>
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
  const params = new URLSearchParams();
  params.append("q", searchText.length === 0 ? "" : searchText);

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

  return json.records.page.map((result) => {
    return {
      name: result.title,
      category: result.sections[0],
      url: result.url,
    };
  });
}

interface Parameters {
  title: string;
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

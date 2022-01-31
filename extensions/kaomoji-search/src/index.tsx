import { ActionPanel, CopyToClipboardAction, List, showToast, ToastStyle, randomId } from "@raycast/api";
import { useState, useEffect, useRef } from "react";
import { AbortError } from "node-fetch";
import find from "asciilib/find";

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

function SearchListItem({ searchResult }: { searchResult: SearchResult }) {
  return (
    <List.Item
      title={searchResult.name}
      accessoryTitle={searchResult.description}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <CopyToClipboardAction title="Copy to Clipboard" content={searchResult.name} />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
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
}

async function performSearch(searchText: string, signal: AbortSignal): Promise<SearchResult[]> {
  interface AsciiLibEntry {
    name: string;
    entry: string;
    keywords: string[];
    category: string;
  }

  console.log("searching for", searchText);

  const findPromise: Promise<AsciiLibEntry[]> = find(searchText.toLowerCase()).toArray().toPromise();

  const results = (await findPromise) as AsciiLibEntry[];

  if (signal.aborted) {
    return Promise.reject(new AbortError());
  }

  console.log("results count", results.length);

  return results.map((entry: AsciiLibEntry) => {
    return {
      id: randomId(),
      name: entry.entry as string,
      description: entry.name as string,
    };
  });
}

interface SearchState {
  results: SearchResult[];
  isLoading: boolean;
}

interface SearchResult {
  id: string;
  name: string;
  description: string;
}

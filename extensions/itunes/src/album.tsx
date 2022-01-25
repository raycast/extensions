import { ActionPanel, List, showToast, ToastStyle, randomId, Detail, Icon } from "@raycast/api";
import { useState, useEffect, useRef } from "react";
import { AbortError } from "node-fetch";
import { testXML, cue, performSearch } from "./functions";

interface SearchState {
  results: SearchResult[];
  isLoading: boolean;
}

interface SearchResult {
  id: string;
  artist: string;
  album: string;
}

export default function Command() {
  const { state, search } = useSearch();
  if (!testXML()) {
    return (
      <Detail
        markdown={
          "# XML Path is Not Valid  \nPlease check the XML path in ```Extension Preferences -> Library XML Path```"
        }
      />
    );
  }
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
      title={searchResult.album}
      subtitle={searchResult.artist}
      actions={
        <ActionPanel>
          <ActionPanel.Item
            title={`Play the Album`}
            icon={Icon.ArrowRight}
            onAction={() => cue({ album: searchResult.album, artist: searchResult.artist })}
          />
        </ActionPanel>
      }
    />
  );
}

function useSearch() {
  const [state, setState] = useState<SearchState>({
    results: [],
    isLoading: true,
  });
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
      const match = await performSearch(searchText, "album", cancelRef.current.signal);
      setState((oldState) => ({
        ...oldState,
        results: match.map((entry) => {
          return {
            id: randomId(),
            ...entry,
          };
        }),
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

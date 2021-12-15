

import {
  ActionPanel,
  CopyToClipboardAction,
  List,
  OpenInBrowserAction,
  showToast,
  ToastStyle,
  randomId,
} from "@raycast/api";
import { useState, useEffect, useRef } from "react";
import fetch, { AbortError } from "node-fetch";

/**
 * Translates Turkish-English bidirectionally
 * https://tureng-api.vercel.app used as API, provided by Mehmet Burak Erman.
 * Icon by Freepik https://www.flaticon.com/premium-icon/dictionary_3285819
 * API-Example used: https://github.com/raycast/extensions/blob/main/examples/api-examples/src/typeahead-search.tsx
 * @author: myucesan
 */
export default function Command() {
  const { state, search } = useSearch();

  return (
    <List isLoading={state.isLoading} onSearchTextChange={search} searchBarPlaceholder="Search Turkish or English word" throttle>
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
      title={searchResult.word}
      accessoryTitle={searchResult.meaning}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <OpenInBrowserAction title="Open in Browser" url={searchResult.url} />
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
      console.error("Error Search", error);
      showToast(ToastStyle.Failure, "Search unsuccesful", String(error));
    }
  }

  return {
    state: state,
    search: search,
  };
}

async function performSearch(searchText: string, signal: AbortSignal): Promise<SearchResult[]> {
  const params = new URLSearchParams();
  params.append("q", searchText.length === 0 ? "placeholder" : searchText);
  console.log(params.get("q"))
  const response = await fetch("https://tureng-api.vercel.app/api/" + params.get("q"));
  // for "Open in Browser"
  const theURL = "https://tureng.com/en/turkish-english/" + params.get("q");



  if (!response.ok) {
    console.log("Fetching succesful");
    return Promise.reject(response.statusText);
  }



const json = (await response.json()) as Json;
console.log(json);
console.log("arrives here 1");
const jsonResults = (json?.meanings as Json) ?? [];
console.log("arrives here 2");

return jsonResults.map((jsonResult) => {
  console.log("arrives here 3");
  const definition = jsonResult as Json;
  console.log("WORD" +definition);
  return {
    id: randomId(),
    word: json?.word as string,
    success: true as boolean,
    meaning: definition as string,
    url: theURL as string
  };
});
}

interface SearchState {
  results: SearchResult[];
  isLoading: boolean;
}

interface SearchResult {
  id: string;
  word: string;
  success: boolean;
  meaning: string;
  url: string;
}

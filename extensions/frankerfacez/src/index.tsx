import { ActionPanel, Action, List, showToast, Toast } from "@raycast/api";
import { useState, useEffect, useRef, useCallback } from "react";
import fetch, { AbortError } from "node-fetch";

export default function Command() {
  const { state, search } = useSearch();

  return (
    <List
      isLoading={state.isLoading}
      onSearchTextChange={search}
      searchBarPlaceholder="Search FrankerFaceZ emotes..."
      throttle
      isShowingDetail
    >
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
      icon={searchResult.urls[1]}
      detail={<List.Item.Detail markdown={getMarkdown(searchResult)} />}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.CopyToClipboard content={searchResult.urls[1]} />
            <Action.Paste content={searchResult.urls[1]} />
            <Action.OpenInBrowser url={"https://www.frankerfacez.com/emoticon/" + searchResult.id} />
          </ActionPanel.Section>
          <ActionPanel.Section>
            {searchResult.urls[1] && <Action.CopyToClipboard title="Copy 1x Emote" content={searchResult.urls[1]} />}
            {searchResult.urls[2] && <Action.CopyToClipboard title="Copy 2x Emote" content={searchResult.urls[2]} />}
            {searchResult.urls[4] && <Action.CopyToClipboard title="Copy 4x Emote" content={searchResult.urls[4]} />}
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

function getMarkdown(searchresult: SearchResult): string {
  return `
  ### ${searchresult.name} by ${searchresult.username}
  ![](${getLargestImage(searchresult.urls)})`;
}

function getLargestImage(urls: { 1: string; 2: string; 4: string }): string {
  if (urls[4]) {
    return urls[4];
  } else if (urls[2]) {
    return urls[2];
  } else {
    return urls[1];
  }
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
  const params = new URLSearchParams();
  params.append("q", searchText.length === 0 ? "" : searchText);

  const response = await fetch("https://api.frankerfacez.com/v1/emotes?sort=count-desc&" + params.toString(), {
    method: "get",
    signal: signal,
  });

  const json = (await response.json()) as
    | {
        emoticons: {
          id: number;
          name: string;
          height: number;
          width: number;
          usage_count: number;
          owner: { name: string };
          urls: {
            1: string;
            2: string;
            4: string;
          };
        }[];
      }
    | { code: string; message: string };

  if (!response.ok || "message" in json) {
    throw new Error("message" in json ? json.message : response.statusText);
  }

  return json.emoticons.map((result) => {
    return {
      id: result.id,
      name: result.name,
      uses: result.usage_count,
      username: result.owner.name,
      urls: {
        1: result.urls[1] && "https:" + result.urls[1],
        2: result.urls[2] && "https:" + result.urls[2],
        4: result.urls[4] && "https:" + result.urls[4],
      },
    };
  });
}

interface SearchState {
  results: SearchResult[];
  isLoading: boolean;
}

interface SearchResult {
  id: number;
  name: string;
  username: string;
  urls: {
    1: string;
    2: string;
    4: string;
  };
  uses: number;
}

import { ActionPanel, Action, List, showToast, Toast } from "@raycast/api";
import { useState, useEffect, useRef, useCallback } from "react";
import fetch, { AbortError } from "node-fetch";
import { LocalStorage } from "@raycast/api";
import groupBy from "lodash.groupby";

const baseUrl = "https://design.gitlab.com/";
const apiUrl = `${baseUrl}/_nuxt/search-index/en.json`;

export default function Command() {
  const { state, search } = useSearch();

  return (
    <List
      isLoading={state.isLoading}
      onSearchTextChange={search}
      searchBarPlaceholder="Search GitLab Design System..."
      throttle
    >
      {Object.entries(groupBy(state.metas, "category")).map(([category, group]) => (
        <List.Section title={category + ""} subtitle={group.length + ""} key={category}>
          {group.map((searchResult) => (
            <SearchListItem key={searchResult.key} searchResult={searchResult} />
          ))}
        </List.Section>
      ))}
    </List>
  );
}

function SearchListItem({ searchResult }: { searchResult: SearchResult }) {
  return (
    <List.Item
      icon="pajamas-icon.png"
      title={searchResult.name}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser url={searchResult.url} />
        </ActionPanel>
      }
    />
  );
}

function useSearch() {
  const [state, setState] = useState<SearchState>({ metas: [], isLoading: true });
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
        const metas = await performSearch(searchText, cancelRef.current.signal);
        setState((oldState) => ({
          ...oldState,
          metas: metas,
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
  let metas: string = (await LocalStorage.getItem("GitLabDesignAPI")) || "";

  if (!metas) {
    const response = await fetch(apiUrl, {
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      signal: signal,
    });

    const json = (await response.json()) as
      | {
          metas: Array<MetaItem>;
        }
      | { code: string; message: string };

    if (!response.ok || "message" in json) {
      throw new Error("message" in json ? json.message : response.statusText);
    }

    await LocalStorage.setItem("GitLabDesignAPI", JSON.stringify(json["metas"]));
    metas = (await LocalStorage.getItem("GitLabDesignAPI")) || "";
  }

  const entries: Array<SearchResult> = [];
  const data: Array<MetaItem> = Object.values(JSON.parse(metas));

  data.forEach((item) => {
    if (item.title.toLowerCase().includes(searchText.toLowerCase())) {
      const title = item.title.split(" > ");
      entries.push({
        key: item.title,
        name: title[1],
        category: title[0],
        url: baseUrl + item.route,
      });
    }
  });

  return entries;
}

interface MetaItem {
  title: string;
  route: string;
}
interface SearchState {
  metas: SearchResult[];
  isLoading: boolean;
}
interface SearchResult {
  key: string;
  icon?: string;
  name: string;
  category?: string;
  url: string;
}

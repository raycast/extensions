import { ActionPanel, Action, List, showToast, Toast } from "@raycast/api";
import { useState, useEffect, useRef, useCallback } from "react";
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
            <SearchListItem key={searchResult.url} searchResult={searchResult} />
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
      subtitle={searchResult.path}
      accessoryTitle={searchResult.category}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser url={searchResult.url} />
          <Action.CopyToClipboard title="Copy URL" content={searchResult.url} />
        </ActionPanel>
      }
    />
  );
}

function useSearch() {
  const [state, setState] = useState<SearchState>({ metas: [], isLoading: true });
  // Monotonically increasing id used to ignore stale (superseded) requests
  // instead of aborting in-flight fetches, which can emit unhandled errors.
  const requestIdRef = useRef(0);

  const search = useCallback(async function search(searchText: string) {
    const requestId = ++requestIdRef.current;
    setState((oldState) => ({
      ...oldState,
      isLoading: true,
    }));
    try {
      const metas = await performSearch(searchText);

      // A newer search has started since this one; drop these results.
      if (requestId !== requestIdRef.current) {
        return;
      }

      setState((oldState) => ({
        ...oldState,
        metas: metas,
        isLoading: false,
      }));
    } catch (error) {
      if (requestId !== requestIdRef.current || isAbortError(error)) {
        return;
      }

      setState((oldState) => ({
        ...oldState,
        isLoading: false,
      }));

      console.error("search error", error);
      showToast({ style: Toast.Style.Failure, title: "Could not perform search", message: String(error) });
    }
  }, []);

  useEffect(() => {
    search("");
  }, [search]);

  return {
    state: state,
    search: search,
  };
}

// node-fetch / AbortController can surface aborts in several shapes
// depending on the runtime, so check the name and message too.
function isAbortError(error: unknown): boolean {
  if (typeof error !== "object" || error === null) {
    return false;
  }
  const name = (error as { name?: string }).name;
  const message = (error as { message?: string }).message;
  return name === "AbortError" || message === "The operation was aborted." || message === "The user aborted a request.";
}

async function performSearch(searchText: string): Promise<SearchResult[]> {
  let metas: string = (await LocalStorage.getItem("GitLabDesignAPI")) || "";

  if (!metas) {
    const response = await fetch(apiUrl, {
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
    });

    const json = (await response.json()) as
      | {
          metas: Array<MetaItem>;
        }
      | { code: string; message: string };

    if (!response.ok || "message" in json) {
      throw new Error("message" in json ? json.message : response.statusText);
    }

    metas = JSON.stringify(json["metas"]);
    await LocalStorage.setItem("GitLabDesignAPI", metas);
  }

  const entries: Array<SearchResult> = [];
  const data: Array<MetaItem> = Object.values(JSON.parse(metas));

  data.forEach((item) => {
    if (item.title.toLowerCase().includes(searchText.toLowerCase())) {
      const [category, name] = item.title.split(" > ");

      // Skip entries that have no category/section name (e.g. " > Introduction").
      if (!category.trim() || !name) {
        return;
      }

      const route = item.route.replace(/^\//, "");
      const url = baseUrl + route;
      const path = route.split("/").join(" / ");
      entries.push({
        key: url,
        name,
        category,
        path,
        url,
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
  path?: string;
  url: string;
}

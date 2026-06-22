import { ActionPanel, Action, List, showToast, Toast, Icon } from "@raycast/api";
import { useState, useEffect, useRef, useCallback } from "react";
import { LocalStorage } from "@raycast/api";
import groupBy from "lodash.groupby";
import { usePageContent, buildDetailMarkdown } from "./content";

const baseUrl = "https://design.gitlab.com/";
const apiUrl = `${baseUrl}/_nuxt/search-index/en.json`;

export default function Command() {
  const { state, search } = useSearch();
  const [isShowingDetail, setIsShowingDetail] = useState(false);
  const [selectedUrl, setSelectedUrl] = useState<string | null>(null);

  // Fetch content only for the currently selected item, and only while the
  // detail panel is open. This avoids every list item fetching at once.
  const { content, isLoading } = usePageContent(isShowingDetail ? selectedUrl : null);

  return (
    <List
      isLoading={state.isLoading}
      onSearchTextChange={search}
      onSelectionChange={setSelectedUrl}
      searchBarPlaceholder="Search GitLab Design System..."
      isShowingDetail={isShowingDetail}
      throttle
    >
      {Object.entries(groupBy(state.metas, "category")).map(([category, group]) => (
        <List.Section title={category + ""} subtitle={group.length + ""} key={category}>
          {group.map((searchResult) => (
            <SearchListItem
              key={searchResult.url}
              searchResult={searchResult}
              isShowingDetail={isShowingDetail}
              isSelected={selectedUrl === searchResult.url}
              content={content}
              isContentLoading={isLoading}
              onToggleDetail={() => setIsShowingDetail((value) => !value)}
            />
          ))}
        </List.Section>
      ))}
    </List>
  );
}

function SearchListItem({
  searchResult,
  isShowingDetail,
  isSelected,
  content,
  isContentLoading,
  onToggleDetail,
}: {
  searchResult: SearchResult;
  isShowingDetail: boolean;
  isSelected: boolean;
  content: string;
  isContentLoading: boolean;
  onToggleDetail: () => void;
}) {
  const body = isSelected
    ? content || (isContentLoading ? "Loading page content…" : "_No content available for this page._")
    : "";

  const markdown = buildDetailMarkdown(searchResult.name, searchResult.category, body);

  return (
    <List.Item
      id={searchResult.url}
      icon="pajamas-icon.png"
      title={searchResult.name}
      subtitle={isShowingDetail ? undefined : searchResult.path}
      accessoryTitle={isShowingDetail ? undefined : searchResult.category}
      detail={<List.Item.Detail isLoading={isShowingDetail && isSelected && isContentLoading} markdown={markdown} />}
      actions={
        <ActionPanel>
          {isShowingDetail ? (
            <>
              <Action.OpenInBrowser url={searchResult.url} />
              <Action
                title="Hide Details"
                icon={Icon.Sidebar}
                shortcut={{ modifiers: ["cmd"], key: "d" }}
                onAction={onToggleDetail}
              />
            </>
          ) : (
            <Action title="Show Details" icon={Icon.Sidebar} onAction={onToggleDetail} />
          )}
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

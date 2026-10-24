import { ActionPanel, Action, List, showToast, Toast, Icon } from "@raycast/api";
import { useState, useEffect, useRef, useCallback } from "react";
import { LocalStorage } from "@raycast/api";
import { usePageContent, buildDetailMarkdown } from "./content";

// GitLab's handbook search is powered by Algolia DocSearch. These values are
// published in the page source of https://handbook.gitlab.com/ and are used by
// the public handbook search.
const ALGOLIA_APP_ID = "3IIMMA8IDY";
const ALGOLIA_API_KEY = "71feb3efa6044f78ab6b8a7422e727b7";
const ALGOLIA_INDEX = "handbook-gitlab";

const apiUrl = `https://${ALGOLIA_APP_ID}-dsn.algolia.net/1/indexes/${ALGOLIA_INDEX}/query`;

export default function Command() {
  const { state, search } = useSearch();
  const [isShowingDetail, setIsShowingDetail] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const items = state.records.map((searchResult, index) => ({
    id: searchResult.objectID || `${index}`,
    searchResult,
  }));
  const selectedUrl = items.find((item) => item.id === selectedId)?.searchResult.url ?? null;

  // Fetch content only for the currently selected item, and only while the
  // detail panel is open. This avoids every list item fetching at once.
  const { content, isLoading } = usePageContent(isShowingDetail ? selectedUrl : null);

  return (
    <List
      isLoading={state.isLoading}
      onSearchTextChange={search}
      onSelectionChange={setSelectedId}
      searchBarPlaceholder="Search GitLab Handbook..."
      isShowingDetail={isShowingDetail}
      throttle
    >
      <List.Section title="Results" subtitle={state.records.length + ""}>
        {items.map(({ id, searchResult }) => (
          <SearchListItem
            key={id}
            id={id}
            searchResult={searchResult}
            isShowingDetail={isShowingDetail}
            isSelected={selectedId === id}
            content={content}
            isContentLoading={isLoading}
            onToggleDetail={() => setIsShowingDetail((value) => !value)}
          />
        ))}
      </List.Section>
    </List>
  );
}

function SearchListItem({
  id,
  searchResult,
  isShowingDetail,
  isSelected,
  content,
  isContentLoading,
  onToggleDetail,
}: {
  id: string;
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
      id={id}
      icon="handbook-icon.png"
      title={searchResult.name}
      subtitle={isShowingDetail ? undefined : searchResult.description}
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
  const [state, setState] = useState<SearchState>({ records: [], isLoading: true });
  // Monotonically increasing id used to ignore stale (superseded) requests
  // instead of aborting in-flight requests, which can emit unhandled errors.
  const requestIdRef = useRef(0);

  const search = useCallback(async function search(searchText: string) {
    const requestId = ++requestIdRef.current;
    setState((oldState) => ({
      ...oldState,
      isLoading: true,
    }));
    try {
      const records = await performSearch(searchText);

      // A newer search has started since this one; drop these results.
      if (requestId !== requestIdRef.current) {
        return;
      }

      setState((oldState) => ({
        ...oldState,
        records: records,
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

async function performSearch(searchText: string): Promise<SearchResult[]> {
  const lastSearchText: string = (await LocalStorage.getItem("GitLabHandbook.lastSearch")) || "";
  const query = searchText.length > 0 ? searchText : lastSearchText;

  const body = {
    query,
    hitsPerPage: 50,
    attributesToRetrieve: ["url", "hierarchy", "content", "type"],
    attributesToSnippet: ["content:30"],
    snippetEllipsisText: "…",
  };

  const response = await fetch(apiUrl, {
    method: "post",
    headers: {
      "Content-Type": "application/json",
      "X-Algolia-Application-Id": ALGOLIA_APP_ID,
      "X-Algolia-API-Key": ALGOLIA_API_KEY,
    },
    body: JSON.stringify(body),
  });

  const json = (await response.json()) as AlgoliaResponse;

  if (!response.ok || "message" in json) {
    throw new Error("message" in json ? json.message : response.statusText);
  }

  if (searchText.length > 0 && searchText !== lastSearchText) {
    await LocalStorage.setItem("GitLabHandbook.lastSearch", searchText);
  }

  return json.hits.map((hit) => {
    const levels = [
      hit.hierarchy.lvl1,
      hit.hierarchy.lvl2,
      hit.hierarchy.lvl3,
      hit.hierarchy.lvl4,
      hit.hierarchy.lvl5,
      hit.hierarchy.lvl6,
    ].filter((value): value is string => Boolean(value));

    const name = levels.length > 0 ? levels[levels.length - 1] : hit.hierarchy.lvl0 || hit.url;
    const snippet = hit._snippetResult?.content?.value;
    const description = snippet ? stripHtml(snippet) : truncate(hit.content ?? "", 120);

    return {
      objectID: hit.objectID,
      name,
      description,
      category: hit.hierarchy.lvl0 ?? "",
      url: hit.url,
    };
  });
}

function stripHtml(value: string): string {
  return value
    .replace(/<\/?(em|mark)>/g, "")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ");
}

function truncate(value: string, length: number): string {
  return value.length > length ? `${value.slice(0, length).trimEnd()}…` : value;
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

interface AlgoliaHit {
  objectID: string;
  url: string;
  type?: string;
  content?: string | null;
  hierarchy: {
    lvl0?: string | null;
    lvl1?: string | null;
    lvl2?: string | null;
    lvl3?: string | null;
    lvl4?: string | null;
    lvl5?: string | null;
    lvl6?: string | null;
  };
  _snippetResult?: {
    content?: {
      value: string;
    };
  };
}

type AlgoliaResponse =
  | {
      hits: AlgoliaHit[];
    }
  | { message: string };

interface SearchState {
  records: SearchResult[];
  isLoading: boolean;
}

interface SearchResult {
  objectID?: string;
  name: string;
  description?: string;
  category?: string;
  url: string;
}

import { ActionPanel, Action, List, showToast, Toast, Icon } from "@raycast/api";
import { useState, useEffect, useRef, useCallback } from "react";
import { LocalStorage } from "@raycast/api";
import { usePageContent, buildDetailMarkdown } from "./content";

// GitLab migrated their docs search from Algolia DocSearch to Elasticsearch
// (Elastic Cloud). These values are published in the page source of
// https://docs.gitlab.com/ and are used by the public docs search.
const ELASTIC_CLOUD_ID =
  "gitlab-docs-website:dXMtY2VudHJhbDEuZ2NwLmNsb3VkLmVzLmlvJDQwZTQyYTQzMTJiZjQyMzNiMzBiZTg0MTU5YjlkNmE1JGMxODg4Y2U5OTY0YzQzZjc5ZjQ1YTk5NDZmMjI0ODg0";
const ELASTIC_KEY = "NndlZTY1c0JCLTRHU1gzUVBER2w6TVF5OEVIT2JvM1V1X0xjYVpnLVhzQQ==";
const ELASTIC_INDEX = "search-gitlab-docs-v3";

const DOCS_BASE_URL = "https://docs.gitlab.com";

// Derive the Elasticsearch host from the cloud id, mirroring what the
// docs.gitlab.com client does: take the segment after the first ":",
// base64-decode it, split on "$", and build https://<uuid>.<domain>.
function getSearchUrl(): string {
  const encoded = ELASTIC_CLOUD_ID.split(":")[1];
  const decoded = Buffer.from(decodeURIComponent(encoded), "base64").toString("utf-8");
  const [domain, uuid] = decoded.split("$");
  return `https://${uuid}.${domain}/${ELASTIC_INDEX}/_search`;
}

const apiUrl = getSearchUrl();

export default function Command() {
  const { state, search } = useSearch();
  const [isShowingDetail, setIsShowingDetail] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const items = state.results.map((searchResult, index) => ({
    id: `${index}-${searchResult.url}`,
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
      searchBarPlaceholder="Search GitLab Docs..."
      isShowingDetail={isShowingDetail}
      throttle
    >
      <List.Section title="Results" subtitle={state.results.length + ""}>
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
      icon="docs-icon.png"
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
  const [state, setState] = useState<SearchState>({ results: [], isLoading: true });
  // Monotonically increasing id used to ignore stale (superseded) requests
  // instead of aborting in-flight POSTs, which can emit unhandled errors
  // from node-fetch's request body stream.
  const requestIdRef = useRef(0);

  const search = useCallback(async function search(searchText: string) {
    const requestId = ++requestIdRef.current;
    setState((oldState) => ({
      ...oldState,
      isLoading: true,
    }));
    try {
      const results = await performSearch(searchText);

      // A newer search has started since this one; drop these results.
      if (requestId !== requestIdRef.current) {
        return;
      }

      setState((oldState) => ({
        ...oldState,
        results: results,
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
  const lastSearchText: string = (await LocalStorage.getItem("GitLabDocs.lastSearch")) || "";
  const query = searchText.length > 0 ? searchText : lastSearchText;

  const searchFields = ["title^3", "page_title^2", "content"];

  // When there is no query yet, show a default set of results
  // (most relevant docs) instead of an empty list.
  const queryClause =
    query.length === 0
      ? { match_all: {} }
      : {
          bool: {
            must: [
              {
                bool: {
                  minimum_should_match: 1,
                  should: [
                    {
                      multi_match: {
                        query,
                        fields: searchFields,
                        type: "best_fields",
                        operator: "and",
                        fuzziness: "AUTO",
                      },
                    },
                    {
                      multi_match: {
                        query,
                        fields: searchFields,
                        type: "cross_fields",
                      },
                    },
                    {
                      multi_match: {
                        query,
                        fields: searchFields,
                        type: "phrase",
                      },
                    },
                    {
                      multi_match: {
                        query,
                        fields: searchFields,
                        type: "phrase_prefix",
                      },
                    },
                  ],
                },
              },
            ],
          },
        };

  const body = {
    from: 0,
    size: 99,
    _source: {
      includes: ["title", "page_title", "url_path", "gitlab_docs_breadcrumbs", "content"],
    },
    highlight: {
      fields: {
        content: {},
      },
    },
    query: queryClause,
  };

  const response = await fetch(apiUrl, {
    method: "post",
    headers: {
      "Content-Type": "application/json",
      Authorization: `ApiKey ${ELASTIC_KEY}`,
    },
    body: JSON.stringify(body),
  });

  const json = (await response.json()) as ElasticResponse;

  if (!response.ok || "error" in json) {
    const message = "error" in json ? json.error?.reason || "Unknown error" : response.statusText;
    throw new Error(message);
  }

  if (searchText.length > 0 && searchText !== lastSearchText) {
    await LocalStorage.setItem("GitLabDocs.lastSearch", searchText);
  }

  return json.hits.hits.map((hit) => {
    const source = hit._source;
    const snippet = hit.highlight?.content?.[0];
    const description = snippet ? stripHtml(snippet) : truncate(source.content ?? "", 120);
    const url = source.url_path.startsWith("http") ? source.url_path : `${DOCS_BASE_URL}${source.url_path}`;

    return {
      name: source.title || source.page_title,
      description,
      category: source.gitlab_docs_breadcrumbs ?? "",
      url,
    };
  });
}

// node-fetch / AbortController can surface aborts in several shapes
// depending on the runtime, so check the name and message too instead of
// relying solely on `error instanceof AbortError`.
function isAbortError(error: unknown): boolean {
  if (typeof error !== "object" || error === null) {
    return false;
  }
  const name = (error as { name?: string }).name;
  const message = (error as { message?: string }).message;
  return name === "AbortError" || message === "The operation was aborted." || message === "The user aborted a request.";
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

interface ElasticHit {
  _source: {
    title: string;
    page_title: string;
    url_path: string;
    gitlab_docs_breadcrumbs?: string;
    content?: string;
  };
  highlight?: {
    content?: string[];
  };
}

type ElasticResponse =
  | {
      hits: {
        hits: ElasticHit[];
      };
    }
  | { error: { reason?: string } };

interface SearchState {
  results: SearchResult[];
  isLoading: boolean;
}

interface SearchResult {
  name: string;
  description?: string;
  category?: string;
  url: string;
}

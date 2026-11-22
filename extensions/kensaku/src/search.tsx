import path from "node:path";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Action, ActionPanel, Icon, Keyboard, type LaunchProps, List } from "@raycast/api";
import { FileActionSection, ServerActionSection } from "./components/CommonActions";
import {
  buildSnippetMarkdown,
  formatBytes,
  formatShortPath,
  formatUnixTime,
  getMatchTypeColor,
  getMatchTypeLabel,
  modShortcut,
} from "./lib/format";
import { getErrorDescription, isAbortError, readSnippet, searchFiles } from "./lib/kensaku";
import type { SearchResponse, SearchResultItem, SnippetResponse } from "./lib/types";
import { useExtensionPreferences } from "./lib/usePreferences";

type SearchFilter =
  "all" | "type:doc" | "type:code" | "type:image" | "modified:7d" | "modified:30d" | "mode:exhaustive";

interface BuiltSearchRequest {
  query: string;
  mode: "ranked" | "exhaustive";
  modifiedAfter?: string;
}

interface SnippetCacheEntry {
  snippet?: SnippetResponse;
  error?: string;
}

const DEBOUNCE_MS = 150;
const SNIPPET_DEBOUNCE_MS = 80;
const LOAD_MORE_ITEM_ID = "__kensaku_load_more__";

function buildSearchRequest(rawText: string, filter: SearchFilter): BuiltSearchRequest | null {
  const trimmed = rawText.trim();
  if (!trimmed) {
    if (filter === "all" || filter === "mode:exhaustive") {
      return null;
    }
    if (filter.startsWith("modified:")) {
      return {
        query: filter,
        mode: "ranked",
      };
    }
    return {
      query: filter,
      mode: "ranked",
    };
  }

  if (filter === "mode:exhaustive") {
    return { query: trimmed, mode: "exhaustive" };
  }
  if (filter.startsWith("type:")) {
    return { query: `${filter} ${trimmed}`, mode: "ranked" };
  }
  if (filter.startsWith("modified:")) {
    return {
      query: trimmed,
      mode: "ranked",
      modifiedAfter: filter.slice("modified:".length),
    };
  }
  return { query: trimmed, mode: "ranked" };
}

export default function SearchFilesCommand(props: LaunchProps) {
  const prefs = useExtensionPreferences();
  const pageSize = useMemo(() => {
    const parsed = Number(prefs.defaultLimit);
    return Number.isFinite(parsed) && parsed > 0 ? Math.min(Math.max(parsed, 1), 50) : 25;
  }, [prefs.defaultLimit]);

  const [searchText, setSearchText] = useState(props.fallbackText ?? "");
  const [filter, setFilter] = useState<SearchFilter>("all");
  const [showDetail, setShowDetail] = useState<boolean>(prefs.showDetailByDefault !== false);
  const [results, setResults] = useState<SearchResultItem[]>([]);
  const [responseMeta, setResponseMeta] = useState<Omit<SearchResponse, "results"> | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [errorState, setErrorState] = useState<{ title: string; message: string } | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [refreshNonce, setRefreshNonce] = useState(0);

  const snippetCacheRef = useRef<Map<string, SnippetCacheEntry>>(new Map());
  const [, setSnippetTick] = useState(0);
  const loadMoreControllerRef = useRef<AbortController | null>(null);

  const searchRequest = useMemo(() => buildSearchRequest(searchText, filter), [searchText, filter]);
  const activeQueryKey = searchRequest
    ? `${searchRequest.mode}\0${searchRequest.modifiedAfter ?? ""}\0${searchRequest.query}`
    : "";

  const triggerRefresh = useCallback(() => {
    snippetCacheRef.current.clear();
    setRefreshNonce((n) => n + 1);
  }, []);

  useEffect(() => {
    loadMoreControllerRef.current?.abort();
    loadMoreControllerRef.current = null;
    setIsLoadingMore(false);

    if (!searchRequest) {
      setResults([]);
      setResponseMeta(null);
      setErrorState(null);
      setIsLoading(false);
      return;
    }

    const controller = new AbortController();
    setIsLoading(true);
    setErrorState(null);

    const timer = setTimeout(async () => {
      try {
        const res = await searchFiles(
          {
            query: searchRequest.query,
            pageSize,
            mode: searchRequest.mode,
            modifiedAfter: searchRequest.modifiedAfter,
          },
          prefs,
          controller.signal,
        );
        if (controller.signal.aborted) {
          return;
        }
        const { results: pageResults, ...meta } = res;
        setResults(pageResults);
        setResponseMeta(meta);
        setErrorState(null);
      } catch (error) {
        if (controller.signal.aborted || isAbortError(error)) {
          return;
        }
        setResults([]);
        setResponseMeta(null);
        setErrorState(getErrorDescription(error));
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    }, DEBOUNCE_MS);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [searchRequest, pageSize, refreshNonce, prefs]);

  useEffect(() => {
    if (!showDetail || !selectedId || selectedId === LOAD_MORE_ITEM_ID || !searchRequest) {
      return;
    }

    const cacheKey = `${activeQueryKey}\0${selectedId}`;
    if (snippetCacheRef.current.has(cacheKey)) {
      return;
    }

    const item = results.find((candidate) => candidate.path === selectedId);
    if (!item) {
      return;
    }

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const snippet = await readSnippet(
          {
            path: item.path,
            query: searchText.trim() || undefined,
            maxTokens: 320,
          },
          prefs,
          controller.signal,
        );
        if (controller.signal.aborted) {
          return;
        }
        if (snippetCacheRef.current.size > 100) {
          snippetCacheRef.current.clear();
        }
        snippetCacheRef.current.set(cacheKey, { snippet });
        setSnippetTick((t) => t + 1);
      } catch (error) {
        if (controller.signal.aborted || isAbortError(error)) {
          return;
        }
        const message = error instanceof Error ? error.message : String(error);
        snippetCacheRef.current.set(cacheKey, { error: message });
        setSnippetTick((t) => t + 1);
      }
    }, SNIPPET_DEBOUNCE_MS);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [showDetail, selectedId, activeQueryKey, searchRequest, searchText, results, prefs]);

  const handleLoadMore = useCallback(async () => {
    if (!searchRequest || !responseMeta?.has_more || !responseMeta.next_cursor || isLoadingMore) {
      return;
    }

    loadMoreControllerRef.current?.abort();
    const controller = new AbortController();
    loadMoreControllerRef.current = controller;
    setIsLoadingMore(true);

    try {
      const nextPage = await searchFiles(
        {
          query: searchRequest.query,
          pageSize,
          cursor: responseMeta.next_cursor,
          mode: searchRequest.mode,
          modifiedAfter: searchRequest.modifiedAfter,
        },
        prefs,
        controller.signal,
      );
      if (controller.signal.aborted) {
        return;
      }

      const { results: moreResults, ...meta } = nextPage;
      setResults((prev) => {
        const seen = new Set(prev.map((r) => r.path));
        const unique = moreResults.filter((r) => !seen.has(r.path));
        return [...prev, ...unique];
      });
      setResponseMeta(meta);
    } catch (error) {
      if (!controller.signal.aborted && !isAbortError(error)) {
        setErrorState(getErrorDescription(error));
      }
    } finally {
      if (!controller.signal.aborted) {
        setIsLoadingMore(false);
      }
    }
  }, [searchRequest, responseMeta, isLoadingMore, pageSize, prefs]);

  const emptyView = useMemo(() => {
    if (errorState) {
      return (
        <List.EmptyView
          icon={Icon.ExclamationMark}
          title={errorState.title}
          description={errorState.message}
          actions={
            <ActionPanel>
              <ServerActionSection prefs={prefs} onRefresh={triggerRefresh} onServerRestarted={triggerRefresh} />
            </ActionPanel>
          }
        />
      );
    }

    if (!searchRequest) {
      return (
        <List.EmptyView
          icon={Icon.MagnifyingGlass}
          title="Search Files with Kensaku"
          description={'Try "screenshot error", type:pdf invoice, ext:md, modified:7d, size:>10mb, or re:"fn \\w+"'}
          actions={
            <ActionPanel>
              <ServerActionSection prefs={prefs} onServerRestarted={triggerRefresh} />
            </ActionPanel>
          }
        />
      );
    }

    if (!isLoading) {
      return (
        <List.EmptyView
          icon={Icon.Document}
          title="No Matching Files"
          description="Try fewer keywords, clear the filter dropdown, or restart the server to refresh the index snapshot."
          actions={
            <ActionPanel>
              <ServerActionSection prefs={prefs} onRefresh={triggerRefresh} onServerRestarted={triggerRefresh} />
            </ActionPanel>
          }
        />
      );
    }

    return undefined;
  }, [errorState, searchRequest, isLoading, prefs, triggerRefresh]);

  const sectionSubtitle = responseMeta
    ? `${results.length} of ${responseMeta.total}${responseMeta.total_is_lower_bound ? "+" : ""} matches`
    : undefined;

  return (
    <List
      isLoading={isLoading || isLoadingMore}
      isShowingDetail={showDetail && results.length > 0}
      filtering={false}
      throttle
      searchText={searchText}
      onSearchTextChange={setSearchText}
      onSelectionChange={setSelectedId}
      searchBarPlaceholder="Search files, content, OCR, or meaning (e.g. type:pdf invoice, modified:7d)..."
      searchBarAccessory={
        <List.Dropdown tooltip="Filter Results" value={filter} onChange={(value) => setFilter(value as SearchFilter)}>
          <List.Dropdown.Item title="All Files" value="all" />
          <List.Dropdown.Item title="Documents" value="type:doc" />
          <List.Dropdown.Item title="Code" value="type:code" />
          <List.Dropdown.Item title="Images & OCR" value="type:image" />
          <List.Dropdown.Item title="Modified Last 7 Days" value="modified:7d" />
          <List.Dropdown.Item title="Modified Last 30 Days" value="modified:30d" />
          <List.Dropdown.Item title="Exhaustive Path Match" value="mode:exhaustive" />
        </List.Dropdown>
      }
    >
      {results.length === 0 ? (
        emptyView
      ) : (
        <List.Section title="Results" subtitle={sectionSubtitle}>
          {results.map((item) => {
            const filename = path.basename(item.path) || item.path;
            const cacheEntry = snippetCacheRef.current.get(`${activeQueryKey}\0${item.path}`);
            const copySnippetText = cacheEntry?.snippet?.text?.trim() || item.snippet?.trim() || "";
            const detailMarkdown = showDetail
              ? buildSnippetMarkdown(item, cacheEntry?.snippet, cacheEntry?.error)
              : undefined;

            return (
              <List.Item
                key={item.path}
                id={item.path}
                icon={{ fileIcon: item.path }}
                title={filename}
                subtitle={showDetail ? undefined : formatShortPath(path.dirname(item.path))}
                accessories={
                  showDetail
                    ? undefined
                    : [
                        {
                          tag: {
                            value: getMatchTypeLabel(item.match_type),
                            color: getMatchTypeColor(item.match_type),
                          },
                        },
                        { text: formatBytes(item.size) },
                      ]
                }
                detail={
                  showDetail ? (
                    <List.Item.Detail
                      markdown={detailMarkdown}
                      metadata={
                        <List.Item.Detail.Metadata>
                          <List.Item.Detail.Metadata.TagList title="Match">
                            <List.Item.Detail.Metadata.TagList.Item
                              text={getMatchTypeLabel(item.match_type)}
                              color={getMatchTypeColor(item.match_type)}
                            />
                          </List.Item.Detail.Metadata.TagList>
                          <List.Item.Detail.Metadata.Label title="Size" text={formatBytes(item.size)} />
                          <List.Item.Detail.Metadata.Label title="Modified" text={formatUnixTime(item.modified)} />
                          <List.Item.Detail.Metadata.Label title="Score" text={item.score.toFixed(3)} />
                          <List.Item.Detail.Metadata.Label
                            title="Folder"
                            text={formatShortPath(path.dirname(item.path))}
                          />
                          {cacheEntry?.snippet && (
                            <List.Item.Detail.Metadata.Label
                              title="Preview Lines"
                              text={`${cacheEntry.snippet.line_start}–${cacheEntry.snippet.line_end}`}
                            />
                          )}
                        </List.Item.Detail.Metadata>
                      }
                    />
                  ) : undefined
                }
                actions={
                  <ActionPanel>
                    <FileActionSection filePath={item.path} />
                    <ActionPanel.Section title="Preview & Results">
                      {copySnippetText && (
                        <Action.CopyToClipboard
                          title="Copy Matched Snippet"
                          content={copySnippetText}
                          shortcut={Keyboard.Shortcut.Common.Copy}
                        />
                      )}
                      <Action
                        title={showDetail ? "Hide Preview Pane" : "Show Preview Pane"}
                        icon={Icon.Sidebar}
                        shortcut={modShortcut([], "p")}
                        onAction={() => setShowDetail((prev) => !prev)}
                      />
                      {responseMeta?.has_more && responseMeta.next_cursor && (
                        <Action
                          title="Load More Results"
                          icon={Icon.PlusCircle}
                          shortcut={modShortcut([], "l")}
                          onAction={handleLoadMore}
                        />
                      )}
                    </ActionPanel.Section>
                    <ServerActionSection prefs={prefs} onRefresh={triggerRefresh} onServerRestarted={triggerRefresh} />
                  </ActionPanel>
                }
              />
            );
          })}
          {responseMeta?.has_more && responseMeta.next_cursor && (
            <List.Item
              id={LOAD_MORE_ITEM_ID}
              icon={Icon.ArrowDownCircle}
              title="Load More Results"
              subtitle={`Showing ${results.length} of ${responseMeta.total}${responseMeta.total_is_lower_bound ? "+" : ""}`}
              detail={
                showDetail ? (
                  <List.Item.Detail
                    markdown={`### Load More Results\n\nCurrently showing **${results.length}** of **${responseMeta.total}${responseMeta.total_is_lower_bound ? "+" : ""}** matched files.\n\nPress **Enter** to load the next page.`}
                  />
                ) : undefined
              }
              actions={
                <ActionPanel>
                  <Action title="Load More Results" icon={Icon.PlusCircle} onAction={handleLoadMore} />
                  <ServerActionSection prefs={prefs} onRefresh={triggerRefresh} onServerRestarted={triggerRefresh} />
                </ActionPanel>
              }
            />
          )}
        </List.Section>
      )}
    </List>
  );
}

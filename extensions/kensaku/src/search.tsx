import path from "node:path";
import { useCallback, useMemo, useRef, useState } from "react";
import { Action, ActionPanel, Icon, Keyboard, type LaunchProps, List, getPreferenceValues } from "@raycast/api";
import { usePromise } from "@raycast/utils";
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
import { getErrorDescription, readSnippet, searchFiles } from "./lib/kensaku";
import type { ExtensionPreferences, SearchResultItem } from "./lib/types";

type SearchFilter =
  "all" | "type:doc" | "type:code" | "type:image" | "modified:7d" | "modified:30d" | "mode:exhaustive";

interface BuiltSearchRequest {
  query: string;
  mode: "ranked" | "exhaustive";
  modifiedAfter?: string;
}

function buildSearchRequest(rawText: string, filter: SearchFilter): BuiltSearchRequest | null {
  const trimmed = rawText.trim();
  if (!trimmed) {
    if (filter === "all" || filter === "mode:exhaustive") {
      return null;
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

function getResultItemId(item: SearchResultItem, index: number): string {
  return `${index}:${item.path}`;
}

export default function SearchFilesCommand(props: LaunchProps) {
  const prefs = getPreferenceValues<ExtensionPreferences>();
  const pageSize = useMemo(() => {
    const parsed = Number(prefs.defaultLimit);
    return Number.isFinite(parsed) && parsed > 0 ? Math.min(Math.max(parsed, 1), 50) : 25;
  }, [prefs.defaultLimit]);

  const [searchText, setSearchText] = useState(props.fallbackText ?? "");
  const [filter, setFilter] = useState<SearchFilter>("all");
  const [showDetail, setShowDetail] = useState<boolean>(prefs.showDetailByDefault !== false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [searchMeta, setSearchMeta] = useState<{ key: string; total: number; isLowerBound: boolean } | null>(null);

  const searchAbortable = useRef<AbortController | undefined>(undefined);
  const snippetAbortable = useRef<AbortController | undefined>(undefined);

  const searchRequest = useMemo(() => buildSearchRequest(searchText, filter), [searchText, filter]);
  const activeQueryKey = searchRequest
    ? `${searchRequest.mode}\0${searchRequest.modifiedAfter ?? ""}\0${searchRequest.query}`
    : "";

  const {
    data: searchData,
    error: searchError,
    isLoading,
    pagination,
    revalidate,
  } = usePromise(
    (query: string, mode: "ranked" | "exhaustive", modifiedAfter: string | undefined, limit: number, key: string) =>
      async (options: { page: number; cursor?: string }) => {
        const res = await searchFiles(
          {
            query,
            pageSize: limit,
            mode,
            modifiedAfter,
            cursor: options.cursor,
          },
          getPreferenceValues<ExtensionPreferences>(),
          searchAbortable.current?.signal,
        );
        if (!searchAbortable.current?.signal.aborted) {
          setSearchMeta({
            key,
            total: res.total,
            isLowerBound: Boolean(res.total_is_lower_bound),
          });
        }
        return {
          data: res.results,
          hasMore: Boolean(res.has_more && res.next_cursor),
          cursor: res.next_cursor ?? undefined,
        };
      },
    [
      searchRequest?.query ?? "",
      searchRequest?.mode ?? "ranked",
      searchRequest?.modifiedAfter,
      pageSize,
      activeQueryKey,
    ],
    {
      execute: Boolean(searchRequest),
      abortable: searchAbortable,
      failureToastOptions: { title: "Failed to Search Files" },
    },
  );

  const results = useMemo(() => (searchRequest ? (searchData ?? []) : []), [searchRequest, searchData]);

  const selectedItem = useMemo(() => {
    if (!selectedId) {
      return null;
    }
    return results.find((item, index) => getResultItemId(item, index) === selectedId) ?? null;
  }, [results, selectedId]);

  const {
    data: activeSnippet,
    error: snippetError,
    isLoading: isSnippetLoading,
    revalidate: revalidateSnippet,
  } = usePromise(
    async (filePath: string, query: string | undefined) =>
      readSnippet(
        {
          path: filePath,
          query,
          maxTokens: 320,
        },
        getPreferenceValues<ExtensionPreferences>(),
        snippetAbortable.current?.signal,
      ),
    [selectedItem?.path ?? "", searchText.trim() || undefined],
    {
      execute: Boolean(showDetail && selectedItem),
      abortable: snippetAbortable,
      onError: () => {
        // Binary/excluded files degrade gracefully to inline item.snippet without noisy error toasts.
      },
    },
  );

  const handleRefresh = useCallback(() => {
    void revalidate();
    if (showDetail && selectedItem) {
      void revalidateSnippet();
    }
  }, [revalidate, revalidateSnippet, showDetail, selectedItem]);

  const errorInfo = searchRequest && searchError ? getErrorDescription(searchError) : null;

  const emptyView = useMemo(() => {
    if (errorInfo) {
      return (
        <List.EmptyView
          icon={Icon.ExclamationMark}
          title={errorInfo.title}
          description={errorInfo.message}
          actions={
            <ActionPanel>
              <ServerActionSection onRefresh={handleRefresh} onServerRestarted={handleRefresh} />
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
              <ServerActionSection onServerRestarted={handleRefresh} />
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
              <ServerActionSection onRefresh={handleRefresh} onServerRestarted={handleRefresh} />
            </ActionPanel>
          }
        />
      );
    }

    return undefined;
  }, [errorInfo, searchRequest, isLoading, handleRefresh]);

  const sectionSubtitle =
    searchMeta && searchMeta.key === activeQueryKey && results.length > 0
      ? `${results.length} of ${searchMeta.total}${searchMeta.isLowerBound ? "+" : ""} matches`
      : undefined;

  return (
    <List
      isLoading={isLoading}
      isShowingDetail={showDetail && results.length > 0}
      filtering={false}
      throttle
      pagination={searchRequest ? pagination : undefined}
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
          {results.map((item, index) => {
            const itemId = getResultItemId(item, index);
            const filename = path.basename(item.path) || item.path;
            const isSelected = selectedItem?.path === item.path;
            const itemSnippet = activeSnippet?.path === item.path ? activeSnippet : null;
            const itemSnippetError =
              isSelected && !isSnippetLoading && !itemSnippet && snippetError ? snippetError.message : null;
            const copySnippetText = itemSnippet?.text?.trim() || item.snippet?.trim() || "";
            const detailMarkdown = showDetail ? buildSnippetMarkdown(item, itemSnippet, itemSnippetError) : undefined;

            return (
              <List.Item
                key={itemId}
                id={itemId}
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
                          {itemSnippet && (
                            <List.Item.Detail.Metadata.Label
                              title="Preview Lines"
                              text={`${itemSnippet.line_start}–${itemSnippet.line_end}`}
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
                      {pagination?.hasMore && !isLoading && (
                        <Action
                          title="Load More Results"
                          icon={Icon.PlusCircle}
                          shortcut={modShortcut([], "l")}
                          onAction={() => pagination.onLoadMore()}
                        />
                      )}
                    </ActionPanel.Section>
                    <ServerActionSection onRefresh={handleRefresh} onServerRestarted={handleRefresh} />
                  </ActionPanel>
                }
              />
            );
          })}
        </List.Section>
      )}
    </List>
  );
}

import { JSX } from "react";
import {
  List,
  ActionPanel,
  Action,
  Icon,
  useNavigation,
  showToast,
  Toast,
  openExtensionPreferences,
  open,
} from "@raycast/api";
import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { useCachedState } from "@raycast/utils";
import { authorize } from "./auth";
import { debug } from "./debug";
import { listAccounts, searchAccount, SearchResult, Account, formatFileSize, getAssetIcon } from "./api/frameio";
import { FolderView } from "./components/FolderView";
import { RequireClientId } from "./components/RequireClientId";
import { buildFolderOrProjectDetail, buildSearchResultDetail, useFileDetailEnrichment } from "./components/AssetDetail";
import { saveLastFolder, saveLastFolderFromParent, resolveContainingFolder } from "./last-folder";

type FilterType = "all" | "files" | "folders" | "projects";

const FILTER_LABELS: Record<FilterType, string> = {
  all: "All",
  files: "Files",
  folders: "Folders",
  projects: "Projects",
};

export default function SearchCommand(): JSX.Element {
  return (
    <RequireClientId>
      <SearchCommandMain />
    </RequireClientId>
  );
}

function SearchCommandMain(): JSX.Element {
  const { push } = useNavigation();
  const [account, setAccount] = useState<Account | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<FilterType>("all");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState<number | null>(null);
  const [showDetail, setShowDetail] = useCachedState("search-show-detail", false);
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);

  const fileResults = useMemo(
    () =>
      results.filter((r) => r.type === "file" && r.project_id).map((r) => ({ id: r.id, project_id: r.project_id! })),
    [results]
  );

  const { thumbnails, commentCounts, isLoadingComments } = useFileDetailEnrichment(
    account?.id ?? "",
    fileResults,
    showDetail
  );

  useEffect(() => {
    async function init() {
      try {
        await authorize();
        const accounts = await listAccounts();
        if (accounts.length === 0) throw new Error("No Frame.io account found.");
        setAccount(accounts[0]);
      } catch (error) {
        showToast({ style: Toast.Style.Failure, title: "Authentication Error", message: String(error) });
      } finally {
        setIsAuthLoading(false);
      }
    }
    init();
  }, []);

  const runSearch = useCallback(
    async (searchQuery: string, filterType: FilterType, accountId: string, reset = true) => {
      if (!searchQuery.trim()) {
        setResults([]);
        setNextCursor(null);
        setTotalCount(null);
        return;
      }

      setIsSearching(true);
      if (reset) {
        setResults([]);
        setNextCursor(null);
      }

      try {
        const res = await searchAccount({
          query: searchQuery.trim(),
          accountId,
          engine: "lexical",
          includeFiles: filterType === "all" || filterType === "files",
          includeFolders: filterType === "all" || filterType === "folders",
          includeProjects: filterType === "all" || filterType === "projects",
          pageSize: 50,
          after: reset ? undefined : (nextCursor ?? undefined),
        });

        const items = res.data ?? [];
        debug.info(`Search "${searchQuery}" → ${items.length} result(s)`, { filter: filterType });
        setResults((prev) => (reset ? items : [...prev, ...items]));
        setNextCursor(res.links?.next ? extractCursor(res.links.next) : null);
        setTotalCount(res.total_count ?? null);
      } catch (error) {
        debug.error(`Search failed for "${searchQuery}"`, error);
        showToast({ style: Toast.Style.Failure, title: "Search Error", message: String(error) });
      } finally {
        setIsSearching(false);
      }
    },
    [nextCursor]
  );

  useEffect(() => {
    if (!account) return;
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      runSearch(query, filter, account.id);
    }, 400);
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [query, filter, account, runSearch]);

  const loadMore = useCallback(() => {
    if (!account || !nextCursor || isSearching) return;
    runSearch(query, filter, account.id, false);
  }, [account, nextCursor, isSearching, query, filter, runSearch]);

  const filterDropdown = (
    <List.Dropdown tooltip="Filter by type" value={filter} onChange={(value) => setFilter(value as FilterType)}>
      {(Object.keys(FILTER_LABELS) as FilterType[]).map((key) => (
        <List.Dropdown.Item key={key} title={FILTER_LABELS[key]} value={key} />
      ))}
    </List.Dropdown>
  );

  return (
    <List
      isLoading={isAuthLoading || isSearching}
      searchBarPlaceholder="Search files, folders, projects…"
      searchBarAccessory={filterDropdown}
      onSearchTextChange={setQuery}
      throttle={false}
      isShowingDetail={showDetail}
    >
      {results.length === 0 && (
        <List.EmptyView
          title={query.trim() ? (isSearching ? "Searching…" : "No Results") : "Enter a Search Term"}
          description={
            query.trim() && !isSearching ? `No results for "${query}"` : "Search across your entire Frame.io account"
          }
          icon={Icon.MagnifyingGlass}
        />
      )}

      <List.Section
        title={
          totalCount !== null && query.trim()
            ? `${totalCount} result${totalCount > 1 ? "s" : ""} for "${query}"`
            : undefined
        }
      >
        {results.map((result, index) => (
          <SearchResultItem
            key={`${result.id}-${result.type}-${index}`}
            result={result}
            accountId={account?.id ?? ""}
            showDetail={showDetail}
            onToggleDetail={() => setShowDetail((v) => !v)}
            thumbnailUrl={result.type === "file" ? thumbnails[result.id] : undefined}
            commentCount={result.type === "file" ? commentCounts[result.id] : undefined}
            isLoadingComments={result.type === "file" ? isLoadingComments : false}
            onOpenFolder={async (id, name) => {
              await saveLastFolder({ accountId: account!.id, folderId: id, title: name });
              push(<FolderView accountId={account!.id} folderId={id} title={name} />);
            }}
            onOpenFile={async (result) => {
              await saveLastFolderFromParent(account!.id, result.parent_id);
            }}
            onOpenProject={async (result) => {
              if (result.root_folder_id) {
                await saveLastFolder({
                  accountId: account!.id,
                  folderId: result.root_folder_id,
                  title: result.name,
                });
                push(<FolderView accountId={account!.id} folderId={result.root_folder_id} title={result.name} />);
              }
            }}
            onLoadMore={nextCursor ? loadMore : undefined}
          />
        ))}
      </List.Section>
    </List>
  );
}

interface SearchResultItemProps {
  result: SearchResult;
  accountId: string;
  showDetail: boolean;
  onToggleDetail: () => void;
  thumbnailUrl?: string;
  commentCount?: number;
  isLoadingComments?: boolean;
  onOpenFolder: (folderId: string, name: string) => void;
  onOpenFile: (result: SearchResult) => void;
  onOpenProject: (result: SearchResult) => void;
  onLoadMore?: () => void;
}

function SearchResultItem({
  result,
  accountId,
  showDetail,
  onToggleDetail,
  thumbnailUrl,
  commentCount,
  isLoadingComments,
  onOpenFolder,
  onOpenFile,
  onOpenProject,
  onLoadMore,
}: SearchResultItemProps): JSX.Element {
  const typeLabel =
    result.type === "file"
      ? "File"
      : result.type === "folder"
        ? "Folder"
        : result.type === "project"
          ? "Project"
          : "Other";

  const accessories: List.Item.Accessory[] = [
    {
      tag: {
        value: typeLabel,
        color: result.type === "file" ? "#0066FF" : result.type === "folder" ? "#FF8800" : "#00AA44",
      },
    },
    { date: new Date(result.updated_at), tooltip: "Modified" },
  ];

  if (result.file_size) {
    accessories.unshift({ text: formatFileSize(result.file_size), tooltip: "Size" });
  }

  const canOpenInBrowser = !!result.view_url;
  const isFolder = result.type === "folder";
  const isProject = result.type === "project";

  const detail = showDetail
    ? result.type === "file"
      ? buildSearchResultDetail(result, { thumbnailUrl, commentCount, isLoadingComments })
      : result.type === "folder" || result.type === "project"
        ? buildFolderOrProjectDetail(result.type, result, result.view_url)
        : undefined
    : undefined;

  return (
    <List.Item
      title={result.name || result.id}
      icon={getAssetIcon(result)}
      accessories={showDetail ? undefined : accessories}
      detail={detail}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            {isProject && result.root_folder_id && (
              <Action title="Open Project" icon={Icon.ArrowRight} onAction={() => onOpenProject(result)} />
            )}
            {canOpenInBrowser && !isProject && result.type === "file" && (
              <>
                <Action.OpenInBrowser
                  title="Open in Frame.io"
                  url={result.view_url!}
                  onOpen={() => onOpenFile(result)}
                />
                <Action
                  title="Open Parent Folder"
                  icon={Icon.Folder}
                  onAction={async () => {
                    const parent = await resolveContainingFolder(accountId, result.parent_id);
                    if (parent?.viewUrl) {
                      await open(parent.viewUrl);
                      await saveLastFolder({
                        accountId,
                        folderId: parent.folderId,
                        title: parent.title,
                        viewUrl: parent.viewUrl,
                      });
                    } else {
                      showToast({
                        style: Toast.Style.Failure,
                        title: "Parent Folder URL Not Found",
                      });
                    }
                  }}
                />
              </>
            )}
            {canOpenInBrowser && !isProject && result.type !== "file" && (
              <Action.OpenInBrowser title="Open in Frame.io" url={result.view_url!} />
            )}
            {isFolder && (
              <Action
                title="Open Folder"
                icon={Icon.ArrowRight}
                onAction={() => onOpenFolder(result.id, result.name)}
                shortcut={{ modifiers: ["cmd"], key: "o" }}
              />
            )}
            {canOpenInBrowser && (
              <Action.CopyToClipboard
                title="Copy Frame.io URL"
                content={result.view_url!}
                shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
              />
            )}
          </ActionPanel.Section>
          {onLoadMore && (
            <ActionPanel.Section>
              <Action
                title="Load More Results"
                icon={Icon.Plus}
                onAction={onLoadMore}
                shortcut={{ modifiers: ["cmd", "shift"], key: "l" }}
              />
            </ActionPanel.Section>
          )}
          <ActionPanel.Section>
            <Action
              title={showDetail ? "Hide Details" : "Show Details"}
              icon={showDetail ? Icon.EyeDisabled : Icon.Sidebar}
              onAction={onToggleDetail}
              shortcut={{ modifiers: ["cmd", "shift"], key: "d" }}
            />
            <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

function extractCursor(nextUrl: string): string {
  try {
    const url = new URL(nextUrl);
    return url.searchParams.get("after") ?? "";
  } catch {
    return "";
  }
}

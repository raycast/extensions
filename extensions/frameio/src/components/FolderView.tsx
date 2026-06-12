import { JSX, useEffect, useState, useCallback, useMemo } from "react";
import {
  List,
  ActionPanel,
  Action,
  Icon,
  Image,
  useNavigation,
  showToast,
  Toast,
  openExtensionPreferences,
  open,
  popToRoot,
} from "@raycast/api";
import { useCachedState } from "@raycast/utils";
import {
  FileAsset,
  FolderItem,
  SortOption,
  listFolderChildren,
  buildFolderItems,
  enrichVersionStacks,
  applyVersionCounts,
  sortFolderItems,
  getCommentCounts,
  getFolder,
  buildFolderBrowserUrl,
  formatDate,
  formatFileSize,
  getAssetIcon,
} from "../api/frameio";
import { debug } from "../debug";
import { saveLastFolder, getParentFolderViewUrl } from "../last-folder";

export interface FolderNavigationContext {
  workspaceId: string;
  workspaceName: string;
  projectId: string;
  projectName: string;
}

interface FolderViewProps {
  accountId: string;
  folderId: string;
  title: string;
  navigationContext?: FolderNavigationContext;
  onBrowseWorkspaces?: () => void;
  /** False only when FolderView is the top-level root (avoids popToRoot closing the command). */
  isPushedView?: boolean;
}

const SORT_OPTIONS: Array<{ label: string; value: SortOption }> = [
  { label: "Name (A→Z)", value: "name" },
  { label: "Name (Z→A)", value: "-name" },
  { label: "Modified (newest)", value: "-updated_at" },
  { label: "Modified (oldest)", value: "updated_at" },
  { label: "Uploaded (newest)", value: "-created_at" },
  { label: "Uploaded (oldest)", value: "created_at" },
  { label: "Size (largest)", value: "-file_size" },
  { label: "Size (smallest)", value: "file_size" },
];

export function FolderView({
  accountId,
  folderId,
  title,
  navigationContext,
  onBrowseWorkspaces,
  isPushedView = true,
}: FolderViewProps): JSX.Element {
  const { push, pop } = useNavigation();
  const [showDetail, setShowDetail] = useCachedState("folder-show-detail", false);
  const [rawItems, setRawItems] = useState<FolderItem[]>([]);
  const [sort, setSort] = useState<SortOption>("-updated_at");
  const items = useMemo(() => sortFolderItems(rawItems, sort), [rawItems, sort]);
  const [isLoading, setIsLoading] = useState(true);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [totalCount, setTotalCount] = useState<number | null>(null);
  const [commentCounts, setCommentCounts] = useState<Record<string, number>>({});
  const [isLoadingComments, setIsLoadingComments] = useState(false);
  const [folderViewUrl, setFolderViewUrl] = useState<string | undefined>();

  const loadCommentCountsAsync = useCallback(
    (folderItems: FolderItem[]) => {
      const fileIds = folderItems.filter((i) => i.asset.type === "file").map((i) => i.asset.id);
      if (fileIds.length === 0) return;
      setIsLoadingComments(true);
      getCommentCounts(accountId, fileIds)
        .then((counts) => setCommentCounts((prev) => ({ ...prev, ...counts })))
        .catch((err) => debug.error("Failed to load comments", err))
        .finally(() => setIsLoadingComments(false));
    },
    [accountId]
  );

  const enrichStacksAsync = useCallback(
    (raw: Parameters<typeof buildFolderItems>[0]) => {
      enrichVersionStacks(accountId, raw)
        .then(({ extraItems, counts }) => {
          setRawItems((prev) => {
            const withCounts = applyVersionCounts(prev, counts);
            if (extraItems.length === 0) return withCounts;
            const existingIds = new Set(withCounts.map((i) => i.asset.id));
            const newItems = extraItems.filter((i) => !existingIds.has(i.asset.id));
            return [...withCounts, ...newItems];
          });
        })
        .catch((err) => debug.error("Failed to enrich version stacks", err));
    },
    [accountId]
  );

  const fetchAssets = useCallback(async () => {
    try {
      setIsLoading(true);
      setRawItems([]);
      setNextCursor(null);
      setCommentCounts({});

      debug.info(`Loading folder "${title}"`);
      const res = await listFolderChildren(accountId, folderId, { pageSize: 50 });

      const folderItems = buildFolderItems(res.data);
      setRawItems(folderItems);
      setNextCursor(res.links.next ? extractCursor(res.links.next) : null);
      setTotalCount(res.total_count ?? null);
      setIsLoading(false);

      enrichStacksAsync(res.data);
      loadCommentCountsAsync(folderItems);
    } catch (error) {
      debug.error(`Failed to load folder ${folderId}`, error);
      showToast({ style: Toast.Style.Failure, title: "Loading Error", message: String(error) });
      setIsLoading(false);
    }
  }, [accountId, folderId, title, loadCommentCountsAsync, enrichStacksAsync]);

  useEffect(() => {
    fetchAssets();
  }, [fetchAssets]);

  // Fetch folder metadata + save last folder
  useEffect(() => {
    getFolder(accountId, folderId)
      .then((folder) => {
        const viewUrl = buildFolderBrowserUrl(folder);
        setFolderViewUrl(viewUrl);
        saveLastFolder({ accountId, folderId, title, viewUrl, updatedAt: folder.updated_at });
      })
      .catch((err) => debug.error("Failed to load folder info", err));
  }, [accountId, folderId, title]);

  useEffect(() => {
    const thumb = rawItems.find((i) => i.thumbnailUrl)?.thumbnailUrl;
    if (!thumb) return;
    saveLastFolder({ accountId, folderId, title, thumbnailUrl: thumb, viewUrl: folderViewUrl });
  }, [rawItems, accountId, folderId, title, folderViewUrl]);

  const loadMore = useCallback(async () => {
    if (!nextCursor || isLoadingMore) return;
    setIsLoadingMore(true);
    try {
      const res = await listFolderChildren(accountId, folderId, { pageSize: 50, after: nextCursor });
      const newItems = buildFolderItems(res.data);
      setRawItems((prev) => [...prev, ...newItems]);
      setNextCursor(res.links.next ? extractCursor(res.links.next) : null);
      enrichStacksAsync(res.data);
      loadCommentCountsAsync(newItems);
    } catch (error) {
      debug.error("Pagination failed", error);
      showToast({ style: Toast.Style.Failure, title: "Loading Error", message: String(error) });
    } finally {
      setIsLoadingMore(false);
    }
  }, [accountId, folderId, nextCursor, isLoadingMore, loadCommentCountsAsync, enrichStacksAsync]);

  const handleBrowseWorkspaces = async () => {
    if (!onBrowseWorkspaces) return;
    if (isPushedView) await popToRoot();
    onBrowseWorkspaces();
  };

  const handleBackToParent = () => {
    if (isPushedView) {
      pop();
    } else if (onBrowseWorkspaces) {
      void handleBrowseWorkspaces();
    }
  };

  const browseActions = onBrowseWorkspaces ? (
    <ActionPanel.Section title="Browse">
      <Action
        title="Browse Workspaces"
        icon={Icon.Building}
        onAction={handleBrowseWorkspaces}
        shortcut={{ modifiers: ["cmd", "shift"], key: "w" }}
      />
    </ActionPanel.Section>
  ) : null;

  // Actions shown on empty-folder or list-level (no item selected)
  const listActions = (
    <ActionPanel>
      {isPushedView && (
        <Action
          title="Back to Parent Folder"
          icon={Icon.ArrowLeft}
          onAction={handleBackToParent}
          shortcut={{ modifiers: ["cmd"], key: "[" }}
        />
      )}
      {browseActions}
    </ActionPanel>
  );

  const sortActions = SORT_OPTIONS.map((opt) => (
    <Action
      key={opt.value}
      title={opt.label}
      icon={sort === opt.value ? Icon.Checkmark : Icon.List}
      onAction={() => setSort(opt.value)}
    />
  ));

  const subtitle = totalCount !== null ? `${totalCount} item${totalCount > 1 ? "s" : ""}` : undefined;

  return (
    <List
      isLoading={isLoading || isLoadingMore}
      navigationTitle={title}
      isShowingDetail={showDetail}
      searchBarPlaceholder={`Filter in ${title}…`}
      actions={listActions}
    >
      {!isLoading && items.length === 0 && (
        <List.EmptyView title="Empty Folder" description="This folder contains no files." icon="📁" />
      )}

      {items.map((item, index) => {
        const { asset, thumbnailUrl } = item;
        const isFolder = asset.type === "folder";
        const fileAsset = asset.type === "file" ? (asset as FileAsset) : null;
        const count = fileAsset ? commentCounts[fileAsset.id] : undefined;
        const loadingComments = fileAsset ? isLoadingComments && count === undefined : false;

        const listIcon = thumbnailUrl
          ? { source: thumbnailUrl, mask: Image.Mask.RoundedRectangle }
          : getAssetIcon(asset);

        return (
          <List.Item
            key={asset.id}
            title={asset.name}
            icon={listIcon}
            subtitle={index === 0 ? subtitle : undefined}
            accessories={showDetail ? undefined : buildAccessories(item, count, loadingComments)}
            detail={showDetail ? buildDetail(item, count, loadingComments) : undefined}
            actions={
              <ActionPanel>
                <ActionPanel.Section>
                  {isFolder ? (
                    <Action
                      title="Open Folder"
                      icon={Icon.ArrowRight}
                      onAction={() =>
                        push(
                          <FolderView
                            accountId={accountId}
                            folderId={asset.id}
                            title={asset.name}
                            navigationContext={navigationContext}
                            onBrowseWorkspaces={onBrowseWorkspaces}
                            isPushedView={true}
                          />
                        )
                      }
                    />
                  ) : fileAsset?.view_url ? (
                    <>
                      <Action.OpenInBrowser
                        title="Open in Frame.io"
                        url={fileAsset.view_url}
                        onOpen={() => saveLastFolder({ accountId, folderId, title, viewUrl: folderViewUrl })}
                      />
                      <Action
                        title="Open Parent Folder"
                        icon={Icon.Folder}
                        onAction={async () => {
                          const url = await getParentFolderViewUrl(
                            accountId,
                            fileAsset.parent_id,
                            folderId,
                            folderViewUrl
                          );
                          if (url) {
                            await open(url);
                          } else {
                            showToast({ style: Toast.Style.Failure, title: "Parent Folder URL Not Found" });
                          }
                        }}
                      />
                    </>
                  ) : null}

                  {fileAsset?.view_url && (
                    <Action.CopyToClipboard
                      title="Copy Frame.io URL"
                      content={fileAsset.view_url}
                      shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                    />
                  )}
                </ActionPanel.Section>

                <ActionPanel.Section title="Copy">
                  <Action.CopyToClipboard
                    title={`Copy "${asset.name}" ID`}
                    content={asset.id}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "i" }}
                    onCopy={() =>
                      showToast({
                        style: Toast.Style.Success,
                        title: `${isFolder ? "Folder" : "File"} ID Copied`,
                        message: isFolder ? "Paste it in Extension Preferences → Browse Default Folder ID" : undefined,
                      })
                    }
                  />
                </ActionPanel.Section>

                {isPushedView && (
                  <ActionPanel.Section>
                    <Action
                      title="Back to Parent Folder"
                      icon={Icon.ArrowLeft}
                      onAction={handleBackToParent}
                      shortcut={{ modifiers: ["cmd"], key: "[" }}
                    />
                  </ActionPanel.Section>
                )}

                {browseActions}

                <ActionPanel.Section title="Sort By">{sortActions}</ActionPanel.Section>

                <ActionPanel.Section>
                  <Action
                    title={showDetail ? "Hide Details" : "Show Details"}
                    icon={showDetail ? Icon.EyeDisabled : Icon.Sidebar}
                    onAction={() => setShowDetail((v) => !v)}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "d" }}
                  />
                  <Action
                    title="Refresh"
                    icon={Icon.ArrowClockwise}
                    onAction={fetchAssets}
                    shortcut={{ modifiers: ["cmd"], key: "r" }}
                  />
                  {nextCursor && (
                    <Action
                      title="Load More"
                      icon={Icon.Plus}
                      onAction={loadMore}
                      shortcut={{ modifiers: ["cmd", "shift"], key: "l" }}
                    />
                  )}
                  <Action title="Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        );
      })}
    </List>
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

function buildDetail(item: FolderItem, commentCount?: number, isLoadingComments?: boolean): JSX.Element {
  const { asset, versionCount, thumbnailUrl } = item;
  const isFolder = asset.type === "folder";
  const fileAsset = asset.type === "file" ? (asset as FileAsset) : null;

  return (
    <List.Item.Detail
      markdown={thumbnailUrl ? `![](${thumbnailUrl})` : undefined}
      metadata={
        <List.Item.Detail.Metadata>
          {fileAsset && (
            <>
              <List.Item.Detail.Metadata.Label title="Size" text={formatFileSize(fileAsset.file_size)} />
              {versionCount && versionCount > 1 && (
                <List.Item.Detail.Metadata.Label title="Versions" text={`v${versionCount}`} />
              )}
              <List.Item.Detail.Metadata.Label
                title="Comments"
                text={isLoadingComments ? "…" : commentCount !== undefined ? String(commentCount) : "0"}
              />
            </>
          )}
          {isFolder && <List.Item.Detail.Metadata.Label title="Type" text="Folder" />}
          <List.Item.Detail.Metadata.Separator />
          <List.Item.Detail.Metadata.Label title="Modified" text={formatDate(asset.updated_at)} />
        </List.Item.Detail.Metadata>
      }
    />
  );
}

function buildAccessories(item: FolderItem, commentCount?: number, isLoadingComments?: boolean): List.Item.Accessory[] {
  const { asset, versionCount } = item;
  const accessories: List.Item.Accessory[] = [];

  if (versionCount && versionCount > 1) {
    accessories.push({ tag: { value: `v${versionCount}`, color: "#0066FF" }, tooltip: `${versionCount} versions` });
  }

  if (asset.type === "file") {
    const file = asset as FileAsset;
    accessories.push({ text: formatFileSize(file.file_size), tooltip: "Size" });
    if (isLoadingComments) {
      accessories.push({ icon: { source: Icon.Bubble, tintColor: "raycast-secondary-text" } });
    } else if (commentCount !== undefined && commentCount > 0) {
      accessories.push({ icon: Icon.Bubble, text: String(commentCount) });
    }
  }

  accessories.push({ date: new Date(asset.updated_at), tooltip: "Modified" });
  return accessories;
}

import {
  Action,
  ActionPanel,
  Icon,
  List,
  Grid,
  open,
  useNavigation,
  confirmAlert,
  Alert,
  showToast,
  Toast,
} from "@raycast/api";
import { useCachedPromise, showFailureToast } from "@raycast/utils";
import React, { useMemo, useCallback, memo } from "react";
import { getFolderById, recordFolderAccess, recordItemAccess, invalidateFoldersCache, updateFolder } from "./storage";
import { FolderItem, Folder } from "./types";
import {
  AppLookupMap,
  getItemDisplayName,
  sortFolderItems,
  getItemIcon,
  pluralize,
  generateId,
  findDuplicateItems,
  openAllApplications,
  openAllWebsites,
} from "./utils";
import {
  useApplicationsData,
  useFoldersData,
  useFolderContentsPreferences,
  useRunningApps,
  useCopyUrls,
} from "./hooks";

import AddItemsForm from "./components/add-items-form";
import WebsiteEditForm from "./components/website-edit-form";
import MoveToFolderForm from "./components/move-to-folder-form";
import FolderEditForm from "./folder-edit-form";
import { FolderPreviewDetail } from "./components/folder-preview-detail";
import { EMPTY_FOLDER_VIEW, FOLDER_NOT_FOUND_VIEW } from "./constants";

interface FolderContentsViewProps {
  folderId: string;
  folderName: string;
  parentPath?: string;
}

// Wrapper to avoid circular imports
function FolderContentsViewWrapper({ folderId, folderName, parentPath }: FolderContentsViewProps) {
  return <FolderContentsView folderId={folderId} folderName={folderName} parentPath={parentPath} />;
}

// ===== Extracted Memoized Action Components =====

const OpenNestedFolderAction = memo(function OpenNestedFolderAction({
  folderId,
  itemId,
  itemFolderId,
  itemName,
  currentPath,
  onAccessRecorded,
}: {
  folderId: string;
  itemId: string;
  itemFolderId: string;
  itemName: string;
  currentPath: string;
  onAccessRecorded?: () => void;
}) {
  const { push } = useNavigation();

  const handleOpen = useCallback(async () => {
    await recordItemAccess(folderId, itemId);
    onAccessRecorded?.();
    const newPath = `${currentPath} → ${itemName}`;
    push(<FolderContentsViewWrapper folderId={itemFolderId} folderName={itemName} parentPath={newPath} />);
  }, [folderId, itemId, itemFolderId, itemName, currentPath, onAccessRecorded, push]);

  return <Action title="Open Bundle" icon={Icon.ArrowRight} onAction={handleOpen} />;
});

const AddItemsAction = memo(function AddItemsAction({ folder, onSave }: { folder: Folder; onSave: () => void }) {
  return (
    <Action.Push
      title="Add Items"
      icon={Icon.Plus}
      shortcut={{ modifiers: ["cmd"], key: "n" }}
      target={<AddItemsForm folder={folder} onSave={onSave} />}
      onPop={onSave}
    />
  );
});

// Shared bulk actions (Open All, Copy URLs, Quit All)
const BulkActionsSection = memo(function BulkActionsSection({
  hasApps,
  hasWebsites,
  hasRunningApps,
  hasUrls,
  onOpenAllApps,
  onOpenAllWeb,
  onQuitAll,
  onCopyMarkdown,
  onCopyList,
}: {
  hasApps: boolean;
  hasWebsites: boolean;
  hasRunningApps: boolean;
  hasUrls: boolean;
  onOpenAllApps: () => void;
  onOpenAllWeb: () => void;
  onQuitAll: () => void;
  onCopyMarkdown: () => Promise<void>;
  onCopyList: () => Promise<void>;
}) {
  return (
    <>
      {(hasApps || hasWebsites || hasRunningApps) && (
        <ActionPanel.Section title="Open All">
          {hasApps && (
            <Action
              title="Open All Applications"
              icon={Icon.AppWindow}
              shortcut={{ modifiers: ["cmd"], key: "o" }}
              onAction={onOpenAllApps}
            />
          )}
          {hasWebsites && (
            <Action
              title="Open All Websites"
              icon={Icon.Globe}
              shortcut={{ modifiers: ["cmd", "shift"], key: "o" }}
              onAction={onOpenAllWeb}
            />
          )}
          {hasRunningApps && (
            <Action
              title="Quit All Running Applications"
              icon={Icon.XMarkCircle}
              shortcut={{ modifiers: ["cmd", "shift"], key: "q" }}
              style={Action.Style.Destructive}
              onAction={onQuitAll}
            />
          )}
        </ActionPanel.Section>
      )}
      {hasUrls && (
        <ActionPanel.Section title="Copy URLs">
          <Action
            title="Copy as Markdown"
            icon={Icon.Document}
            shortcut={{ modifiers: ["cmd", "shift"], key: "m" }}
            onAction={onCopyMarkdown}
          />
          <Action
            title="Copy as List"
            icon={Icon.List}
            shortcut={{ modifiers: ["cmd", "shift"], key: "l" }}
            onAction={onCopyList}
          />
        </ActionPanel.Section>
      )}
    </>
  );
});

// Per-item action panel — receives only the props it needs
const ItemActionPanel = memo(function ItemActionPanel({
  item,
  folder,
  folderId,
  displayPath,
  allFolders,
  bulkProps,
  onOpenItem,
  onSave,
  onRemoveItem,
  onDuplicateItem,
  onRemoveDuplicates,
  duplicateInfo,
  revalidate,
}: {
  item: FolderItem;
  folder: Folder;
  folderId: string;
  displayPath: string;
  allFolders: Folder[];
  bulkProps: {
    hasApps: boolean;
    hasWebsites: boolean;
    hasRunningApps: boolean;
    hasUrls: boolean;
    onOpenAllApps: () => void;
    onOpenAllWeb: () => void;
    onQuitAll: () => void;
    onCopyMarkdown: () => Promise<void>;
    onCopyList: () => Promise<void>;
  };
  onOpenItem: (item: FolderItem) => void;
  onSave: () => void;
  onRemoveItem: (item: FolderItem) => void;
  onDuplicateItem: (item: FolderItem) => void;
  onRemoveDuplicates: () => void;
  duplicateInfo: { hasDuplicates: boolean; duplicateCount: number };
  revalidate: () => void;
}) {
  return (
    <ActionPanel>
      {/* Primary Action */}
      <ActionPanel.Section>
        {item.type === "application" ? (
          <Action title="Open Application" icon={Icon.ArrowRight} onAction={() => onOpenItem(item)} />
        ) : item.type === "website" ? (
          <Action title="Open Website" icon={Icon.Globe} onAction={() => onOpenItem(item)} />
        ) : item.folderId ? (
          <OpenNestedFolderAction
            folderId={folderId}
            itemId={item.id}
            itemFolderId={item.folderId}
            itemName={item.name}
            currentPath={displayPath}
            onAccessRecorded={revalidate}
          />
        ) : (
          <Action title="Open Bundle" icon={Icon.ArrowRight} onAction={() => onOpenItem(item)} />
        )}
      </ActionPanel.Section>

      <BulkActionsSection {...bulkProps} />

      {/* Organize */}
      <ActionPanel.Section title="Organize">
        <AddItemsAction folder={folder} onSave={onSave} />
        {item.type === "website" && (
          <Action.Push
            title="Edit Website"
            icon={Icon.Pencil}
            shortcut={{ modifiers: ["cmd"], key: "e" }}
            target={<WebsiteEditForm folder={folder} item={item} onSave={onSave} />}
            onPop={onSave}
          />
        )}
        {item.type === "folder" &&
          item.folderId &&
          (() => {
            const nestedFolder = allFolders.find((f) => f.id === item.folderId);
            return nestedFolder ? (
              <Action.Push
                title="Edit Bundle"
                icon={Icon.Pencil}
                shortcut={{ modifiers: ["cmd"], key: "e" }}
                target={<FolderEditForm folder={nestedFolder} onSave={onSave} navigateToFolderAfterSave={false} />}
                onPop={onSave}
              />
            ) : null;
          })()}
        <Action
          title="Duplicate Item"
          icon={Icon.CopyClipboard}
          shortcut={{ modifiers: ["cmd"], key: "d" }}
          onAction={() => onDuplicateItem(item)}
        />
        {allFolders.length > 1 && (
          <Action.Push
            title="Move to Bundle…"
            icon={Icon.ArrowRightCircle}
            shortcut={{ modifiers: ["cmd"], key: "m" }}
            target={<MoveToFolderForm item={item} currentFolder={folder} onMove={onSave} />}
            onPop={onSave}
          />
        )}
      </ActionPanel.Section>

      {/* Danger Zone */}
      <ActionPanel.Section title="Danger Zone">
        <Action
          title="Remove from Bundle"
          icon={Icon.Trash}
          style={Action.Style.Destructive}
          shortcut={{ modifiers: ["cmd"], key: "backspace" }}
          onAction={() => onRemoveItem(item)}
        />
        {duplicateInfo.hasDuplicates && (
          <Action
            title={`Remove ${duplicateInfo.duplicateCount} Duplicate${duplicateInfo.duplicateCount > 1 ? "s" : ""}`}
            icon={Icon.Trash}
            style={Action.Style.Destructive}
            onAction={onRemoveDuplicates}
          />
        )}
      </ActionPanel.Section>
    </ActionPanel>
  );
});

// ===== Memoized Item Rendering Components =====

const MemoizedListItem = memo(function MemoizedListItem({
  item,
  appMap,
  allFolders,
  showPreviewPane,
  actionPanel,
  detail,
}: {
  item: FolderItem;
  appMap: AppLookupMap;
  allFolders: Folder[];
  showPreviewPane: boolean;
  actionPanel: React.ReactNode;
  detail?: React.ReactNode;
}) {
  return (
    <List.Item
      key={item.id}
      id={item.id}
      title={getItemDisplayName(item, appMap, allFolders)}
      icon={getItemIcon(item, appMap, allFolders)}
      actions={actionPanel}
      detail={detail}
      subtitle={
        showPreviewPane
          ? undefined
          : item.type === "folder"
            ? "Bundle"
            : item.type === "website"
              ? "Website"
              : "Application"
      }
    />
  );
});

const MemoizedGridItem = memo(function MemoizedGridItem({
  item,
  appMap,
  allFolders,
  showSubtitle,
  actionPanel,
}: {
  item: FolderItem;
  appMap: AppLookupMap;
  allFolders: Folder[];
  showSubtitle: boolean;
  actionPanel: React.ReactNode;
}) {
  return (
    <Grid.Item
      key={item.id}
      id={item.id}
      title={getItemDisplayName(item, appMap, allFolders)}
      subtitle={
        showSubtitle
          ? item.type === "folder"
            ? "Bundle"
            : item.type === "website"
              ? "Website"
              : "Application"
          : undefined
      }
      content={getItemIcon(item, appMap, allFolders)}
      actions={actionPanel}
    />
  );
});

// ===== Main Component =====

export default function FolderContentsView({ folderId, folderName, parentPath }: FolderContentsViewProps) {
  const displayPath = parentPath || folderName;

  const prefs = useFolderContentsPreferences();
  const { appMap, isLoading: isLoadingApps } = useApplicationsData();
  const { folders: allFolders } = useFoldersData();

  const {
    data: folder,
    isLoading: isLoadingFolder,
    revalidate,
  } = useCachedPromise(
    async (id: string) => {
      const loaded = await getFolderById(id);
      if (loaded) await recordFolderAccess(id);
      return loaded;
    },
    [folderId],
    {
      keepPreviousData: true,
      failureToastOptions: { title: "Failed to load bundle" },
    },
  );

  const isLoading = isLoadingFolder || isLoadingApps;

  const sortedItems = useMemo(() => {
    if (!folder) return [];
    return sortFolderItems(
      folder.items,
      prefs.folderContentsSortPrimary || "alphabetical-asc",
      prefs.folderContentsSortSecondary || "none",
      prefs.folderContentsSortTertiary || "none",
      appMap,
    );
  }, [
    folder,
    appMap,
    prefs.folderContentsSortPrimary,
    prefs.folderContentsSortSecondary,
    prefs.folderContentsSortTertiary,
  ]);

  const viewType = prefs.folderContentsViewType || "list";
  const showPreviewPane = prefs.showPreviewPane ?? false;

  // Consolidated item filtering — single pass, shared by bulk actions + section rendering (Task 3)
  const { appItems, websiteItems, nestedFolderItems, hasApps, hasWebsites } = useMemo(() => {
    const apps: FolderItem[] = [];
    const websites: FolderItem[] = [];
    const folders: FolderItem[] = [];
    for (const item of sortedItems) {
      if (item.type === "application") apps.push(item);
      else if (item.type === "website") websites.push(item);
      else if (item.type === "folder") folders.push(item);
    }
    return {
      appItems: apps,
      websiteItems: websites,
      nestedFolderItems: folders,
      hasApps: apps.length > 0,
      hasWebsites: websites.length > 0,
    };
  }, [sortedItems]);

  // Render detail for items when preview pane is enabled
  const renderItemDetail = useCallback(
    (item: FolderItem) => {
      if (!showPreviewPane) return undefined;

      if (item.type === "folder" && item.folderId) {
        const nestedFolder = allFolders.find((f) => f.id === item.folderId);
        if (nestedFolder) {
          return <FolderPreviewDetail folder={nestedFolder} appMap={appMap} allFolders={allFolders} />;
        }
      }

      if (item.type === "application") {
        return (
          <List.Item.Detail
            metadata={
              <List.Item.Detail.Metadata>
                <List.Item.Detail.Metadata.Label title="Type" text="Application" />
                <List.Item.Detail.Metadata.Label title="Name" text={getItemDisplayName(item, appMap, allFolders)} />
                {item.path && <List.Item.Detail.Metadata.Label title="Path" text={item.path} />}
              </List.Item.Detail.Metadata>
            }
          />
        );
      }

      if (item.type === "website") {
        return (
          <List.Item.Detail
            metadata={
              <List.Item.Detail.Metadata>
                <List.Item.Detail.Metadata.Label title="Type" text="Website" />
                <List.Item.Detail.Metadata.Label title="Title" text={item.name} />
                {item.url && <List.Item.Detail.Metadata.Link title="URL" text={item.url} target={item.url} />}
              </List.Item.Detail.Metadata>
            }
          />
        );
      }

      return undefined;
    },
    [showPreviewPane, allFolders, appMap],
  );

  const handleSave = useCallback(async () => {
    invalidateFoldersCache();
    await revalidate();
  }, [revalidate]);

  const handleRemoveItem = useCallback(
    async (item: FolderItem) => {
      if (!folder) return;

      const itemName = getItemDisplayName(item, appMap, allFolders);

      const confirmed = await confirmAlert({
        title: "Remove Item",
        message: `Remove "${itemName}" from ${folderName}?`,
        primaryAction: { title: "Remove", style: Alert.ActionStyle.Destructive },
      });

      if (!confirmed) return;

      const updatedItems = folder.items.filter((i) => i.id !== item.id);
      await updateFolder(folderId, { items: updatedItems });
      await showToast({
        title: "Removed",
        message: `${itemName} removed from ${folderName}`,
        style: Toast.Style.Success,
      });
      await handleSave();
    },
    [folder, folderId, folderName, appMap, allFolders, handleSave],
  );

  const duplicateInfo = useMemo(
    () => (folder ? findDuplicateItems(folder.items) : { hasDuplicates: false, duplicateCount: 0, uniqueItems: [] }),
    [folder],
  );

  const handleRemoveDuplicates = useCallback(async () => {
    if (!folder || !duplicateInfo.hasDuplicates) {
      await showToast({ title: "No duplicates found", style: Toast.Style.Success });
      return;
    }

    const { duplicateCount, uniqueItems } = duplicateInfo;

    const confirmed = await confirmAlert({
      title: "Remove Duplicates",
      message: `Remove ${duplicateCount} duplicate ${pluralize(duplicateCount, "item")} from "${folderName}"? The first occurrence of each item will be kept.`,
      primaryAction: { title: "Remove Duplicates", style: Alert.ActionStyle.Destructive },
    });

    if (!confirmed) return;

    await updateFolder(folderId, { items: uniqueItems });
    await showToast({
      title: "Duplicates removed",
      message: `Removed ${duplicateCount} ${pluralize(duplicateCount, "item")}`,
      style: Toast.Style.Success,
    });
    await handleSave();
  }, [folder, folderId, folderName, duplicateInfo, handleSave]);

  const handleDuplicateItem = useCallback(
    async (item: FolderItem) => {
      if (!folder) return;

      const itemName = getItemDisplayName(item, appMap, allFolders);
      const newItem: FolderItem = { ...item, id: generateId() };

      await updateFolder(folderId, { items: [...folder.items, newItem] });
      await showToast({ title: "Item duplicated", message: `"${itemName}" duplicated`, style: Toast.Style.Success });
      await handleSave();
    },
    [folder, folderId, appMap, allFolders, handleSave],
  );

  const handleOpenItem = useCallback(
    async (item: FolderItem) => {
      try {
        await recordItemAccess(folderId, item.id);
        revalidate();

        if (item.type === "application" && item.path) {
          await open(item.path);
          await showToast({
            title: "Opened",
            message: getItemDisplayName(item, appMap, allFolders),
            style: Toast.Style.Success,
          });
        } else if (item.type === "website" && item.url) {
          await open(item.url);
          await showToast({
            title: "Opened",
            message: getItemDisplayName(item, appMap, allFolders),
            style: Toast.Style.Success,
          });
        }
      } catch (error) {
        await showFailureToast(error, { title: "Failed to open" });
      }
    },
    [folderId, appMap, allFolders, revalidate],
  );

  const handleOpenAllApps = useCallback(
    () => openAllApplications(appItems, folderName, appMap),
    [appItems, folderName, appMap],
  );

  const handleOpenAllWeb = useCallback(() => openAllWebsites(websiteItems, folderName), [websiteItems, folderName]);

  const { hasUrls, copyAsMarkdown, copyAsList } = useCopyUrls(folder, allFolders);
  const { hasRunningApps, quitAllRunningApps } = useRunningApps(appItems, appMap);
  const handleQuitAllApplications = useCallback(() => quitAllRunningApps(folderName), [quitAllRunningApps, folderName]);

  // Stable bulk props object for ItemActionPanel
  const bulkProps = useMemo(
    () => ({
      hasApps,
      hasWebsites,
      hasRunningApps,
      hasUrls,
      onOpenAllApps: handleOpenAllApps,
      onOpenAllWeb: handleOpenAllWeb,
      onQuitAll: handleQuitAllApplications,
      onCopyMarkdown: copyAsMarkdown,
      onCopyList: copyAsList,
    }),
    [
      hasApps,
      hasWebsites,
      hasRunningApps,
      hasUrls,
      handleOpenAllApps,
      handleOpenAllWeb,
      handleQuitAllApplications,
      copyAsMarkdown,
      copyAsList,
    ],
  );

  const renderActions = useCallback(
    (item: FolderItem) =>
      folder ? (
        <ItemActionPanel
          item={item}
          folder={folder}
          folderId={folderId}
          displayPath={displayPath}
          allFolders={allFolders}
          bulkProps={bulkProps}
          onOpenItem={handleOpenItem}
          onSave={handleSave}
          onRemoveItem={handleRemoveItem}
          onDuplicateItem={handleDuplicateItem}
          onRemoveDuplicates={handleRemoveDuplicates}
          duplicateInfo={duplicateInfo}
          revalidate={revalidate}
        />
      ) : null,
    [
      folder,
      folderId,
      displayPath,
      allFolders,
      bulkProps,
      handleOpenItem,
      handleSave,
      handleRemoveItem,
      handleDuplicateItem,
      handleRemoveDuplicates,
      duplicateInfo,
      revalidate,
    ],
  );

  const separateSections = prefs.gridSeparateSections ?? true;

  if (!folder) {
    return (
      <List isLoading={isLoading}>
        <List.EmptyView {...FOLDER_NOT_FOUND_VIEW} />
      </List>
    );
  }

  const commonProps = {
    isLoading,
    navigationTitle: displayPath,
    searchBarPlaceholder: "Search items...",
  };

  if (viewType === "grid") {
    return (
      <Grid {...commonProps}>
        {sortedItems.length === 0 ? (
          <Grid.EmptyView
            {...EMPTY_FOLDER_VIEW}
            actions={
              <ActionPanel>
                <ActionPanel.Section>
                  <AddItemsAction folder={folder} onSave={handleSave} />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        ) : separateSections ? (
          <>
            {appItems.length > 0 && (
              <Grid.Section title="Applications" subtitle={`${appItems.length} ${pluralize(appItems.length, "app")}`}>
                {appItems.map((item) => (
                  <MemoizedGridItem
                    key={item.id}
                    item={item}
                    appMap={appMap}
                    allFolders={allFolders}
                    showSubtitle={false}
                    actionPanel={renderActions(item)}
                  />
                ))}
              </Grid.Section>
            )}
            {websiteItems.length > 0 && (
              <Grid.Section
                title="Websites"
                subtitle={`${websiteItems.length} ${pluralize(websiteItems.length, "website")}`}
                inset={Grid.Inset.Large}
              >
                {websiteItems.map((item) => (
                  <MemoizedGridItem
                    key={item.id}
                    item={item}
                    appMap={appMap}
                    allFolders={allFolders}
                    showSubtitle={false}
                    actionPanel={renderActions(item)}
                  />
                ))}
              </Grid.Section>
            )}
            {nestedFolderItems.length > 0 && (
              <Grid.Section
                title="Bundles"
                subtitle={`${nestedFolderItems.length} ${pluralize(nestedFolderItems.length, "bundle")}`}
                inset={Grid.Inset.Large}
              >
                {nestedFolderItems.map((item) => (
                  <MemoizedGridItem
                    key={item.id}
                    item={item}
                    appMap={appMap}
                    allFolders={allFolders}
                    showSubtitle={false}
                    actionPanel={renderActions(item)}
                  />
                ))}
              </Grid.Section>
            )}
          </>
        ) : (
          sortedItems.map((item) => (
            <MemoizedGridItem
              key={item.id}
              item={item}
              appMap={appMap}
              allFolders={allFolders}
              showSubtitle={true}
              actionPanel={renderActions(item)}
            />
          ))
        )}
      </Grid>
    );
  }

  return (
    <List {...commonProps} isShowingDetail={showPreviewPane}>
      {sortedItems.length === 0 ? (
        <List.EmptyView
          {...EMPTY_FOLDER_VIEW}
          actions={
            <ActionPanel>
              <ActionPanel.Section>
                <AddItemsAction folder={folder} onSave={handleSave} />
              </ActionPanel.Section>
            </ActionPanel>
          }
        />
      ) : separateSections ? (
        <>
          {appItems.length > 0 && (
            <List.Section title="Applications" subtitle={`${appItems.length} ${pluralize(appItems.length, "app")}`}>
              {appItems.map((item) => (
                <MemoizedListItem
                  key={item.id}
                  item={item}
                  appMap={appMap}
                  allFolders={allFolders}
                  showPreviewPane={showPreviewPane}
                  actionPanel={renderActions(item)}
                  detail={renderItemDetail(item)}
                />
              ))}
            </List.Section>
          )}
          {websiteItems.length > 0 && (
            <List.Section
              title="Websites"
              subtitle={`${websiteItems.length} ${pluralize(websiteItems.length, "website")}`}
            >
              {websiteItems.map((item) => (
                <MemoizedListItem
                  key={item.id}
                  item={item}
                  appMap={appMap}
                  allFolders={allFolders}
                  showPreviewPane={showPreviewPane}
                  actionPanel={renderActions(item)}
                  detail={renderItemDetail(item)}
                />
              ))}
            </List.Section>
          )}
          {nestedFolderItems.length > 0 && (
            <List.Section
              title="Bundles"
              subtitle={`${nestedFolderItems.length} ${pluralize(nestedFolderItems.length, "bundle")}`}
            >
              {nestedFolderItems.map((item) => (
                <MemoizedListItem
                  key={item.id}
                  item={item}
                  appMap={appMap}
                  allFolders={allFolders}
                  showPreviewPane={showPreviewPane}
                  actionPanel={renderActions(item)}
                  detail={renderItemDetail(item)}
                />
              ))}
            </List.Section>
          )}
        </>
      ) : (
        sortedItems.map((item) => (
          <MemoizedListItem
            key={item.id}
            item={item}
            appMap={appMap}
            allFolders={allFolders}
            showPreviewPane={showPreviewPane}
            actionPanel={renderActions(item)}
            detail={renderItemDetail(item)}
          />
        ))
      )}
    </List>
  );
}

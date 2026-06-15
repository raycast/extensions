import {
  ActionPanel,
  Action,
  List,
  Icon,
  confirmAlert,
  Alert,
  showToast,
  Toast,
  Clipboard,
  Detail,
  Color,
} from "@raycast/api";
import { useState, useEffect, useMemo } from "react";
import { dirname, basename } from "path";
import { statSync } from "fs";
import { ShelfItemWithStatus } from "./lib/types";
import { getShelfItems, removeFromShelf, clearShelf, validateShelfItems, removeStaleItems } from "./lib/shelf-storage";
import { getFileIcon, getFileCategory, getFileExtension, getCategoryIcon } from "./lib/file-icons";
import RenameShelf from "./rename-shelf";
import CopyToSelection from "./copy-to-selection";
import MoveToSelection from "./move-to-selection";

interface ShelfStats {
  totalItems: number;
  fileCount: number;
  folderCount: number;
  locationCount: number;
  totalSize: number;
  categories: string[];
  extensions: string[];
}

function formatSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const size = bytes / Math.pow(1024, i);
  return `${size.toFixed(i > 0 ? 1 : 0)} ${units[i]}`;
}

function getFileSize(path: string): number {
  try {
    const stat = statSync(path);
    return stat.isFile() ? stat.size : 0;
  } catch {
    return 0;
  }
}

function computeStats(items: ShelfItemWithStatus[]): ShelfStats {
  const locations = new Set(items.map((item) => dirname(item.path)));
  const categoriesSet = new Set<string>();
  const extensionsSet = new Set<string>();

  let fileCount = 0;
  let folderCount = 0;
  let totalSize = 0;

  for (const item of items) {
    if (item.type === "folder") {
      folderCount++;
    } else {
      fileCount++;
      totalSize += getFileSize(item.path);
    }

    const category = getFileCategory(item);
    categoriesSet.add(category);

    const ext = getFileExtension(item);
    if (ext !== "folder" && ext !== "unknown") {
      extensionsSet.add(ext);
    }
  }

  return {
    totalItems: items.length,
    fileCount,
    folderCount,
    locationCount: locations.size,
    totalSize,
    categories: Array.from(categoriesSet).sort(),
    extensions: Array.from(extensionsSet).sort(),
  };
}

function ItemDetail({ stats }: { stats: ShelfStats }) {
  return (
    <List.Item.Detail
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Total Items" text={String(stats.totalItems)} />
          <Detail.Metadata.Label
            title="Breakdown"
            text={`${stats.fileCount} file${stats.fileCount !== 1 ? "s" : ""}, ${stats.folderCount} folder${stats.folderCount !== 1 ? "s" : ""}`}
          />
          <Detail.Metadata.Label title="Total Size" text={formatSize(stats.totalSize)} />
          <Detail.Metadata.Label
            title="Locations"
            text={`${stats.locationCount} folder${stats.locationCount !== 1 ? "s" : ""}`}
          />
          <Detail.Metadata.Separator />
          <Detail.Metadata.TagList title="Categories">
            {stats.categories.map((category) => (
              <Detail.Metadata.TagList.Item
                key={category}
                text={category}
                icon={getCategoryIcon(category)}
                color={Color.Blue}
              />
            ))}
          </Detail.Metadata.TagList>
          <Detail.Metadata.Separator />
          <Detail.Metadata.TagList title="Extensions">
            {stats.extensions.map((ext) => (
              <Detail.Metadata.TagList.Item key={ext} text={`.${ext}`} color={Color.SecondaryText} />
            ))}
          </Detail.Metadata.TagList>
        </Detail.Metadata>
      }
    />
  );
}

export default function Command() {
  const [items, setItems] = useState<ShelfItemWithStatus[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isShowingDetail, setIsShowingDetail] = useState(false);

  const loadItems = async () => {
    const shelfItems = await getShelfItems();
    setItems(validateShelfItems(shelfItems));
    setIsLoading(false);
  };

  useEffect(() => {
    loadItems();
  }, []);

  // Group items by parent folder
  const groupedItems = useMemo(() => {
    const groups: Record<string, ShelfItemWithStatus[]> = {};
    for (const item of items) {
      const parent = dirname(item.path);
      if (!groups[parent]) groups[parent] = [];
      groups[parent].push(item);
    }
    // Sort groups by folder name
    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
  }, [items]);

  // Compute stats
  const stats = useMemo(() => computeStats(items), [items]);

  const staleItems = useMemo(() => items.filter((item) => item.isStale), [items]);

  const handleRemove = async (id: string) => {
    await removeFromShelf(id);
    await loadItems();
    await showToast({ style: Toast.Style.Success, title: "Removed from shelf" });
  };

  const handleClear = async () => {
    const confirmed = await confirmAlert({
      title: "Clear Shelf",
      message: `Are you sure you want to remove all ${items.length} items from the shelf?`,
      primaryAction: {
        title: "Clear All",
        style: Alert.ActionStyle.Destructive,
      },
    });

    if (confirmed) {
      await clearShelf();
      await loadItems();
      await showToast({ style: Toast.Style.Success, title: "Shelf cleared" });
    }
  };

  const handleRemoveStale = async () => {
    const removedCount = await removeStaleItems();
    await loadItems();
    if (removedCount > 0) {
      await showToast({
        style: Toast.Style.Success,
        title: `Removed ${removedCount} stale item${removedCount !== 1 ? "s" : ""}`,
      });
    } else {
      await showToast({ style: Toast.Style.Success, title: "No stale items found" });
    }
  };

  const getItemActions = (item: ShelfItemWithStatus) => (
    <ActionPanel>
      <ActionPanel.Section>
        <Action
          icon={isShowingDetail ? Icon.EyeDisabled : Icon.Eye}
          title={isShowingDetail ? "Hide Shelf Details" : "Show Shelf Details"}
          onAction={() => setIsShowingDetail(!isShowingDetail)}
        />
      </ActionPanel.Section>
      <ActionPanel.Section title="Item Actions">
        <Action.ShowInFinder path={item.path} />
        <Action.OpenWith path={item.path} />
        <Action
          icon={Icon.Clipboard}
          title="Copy Path"
          shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
          onAction={async () => {
            await Clipboard.copy(item.path);
            await showToast({ style: Toast.Style.Success, title: "Path copied" });
          }}
        />
        <Action
          icon={Icon.Trash}
          title="Remove from Shelf"
          style={Action.Style.Destructive}
          shortcut={{ modifiers: ["ctrl"], key: "x" }}
          onAction={() => handleRemove(item.id)}
        />
      </ActionPanel.Section>
      <ActionPanel.Section title="Shelf Actions">
        <Action.Push
          icon={Icon.CopyClipboard}
          title="Copy All to Finder Selection…"
          shortcut={{ modifiers: ["cmd", "shift"], key: "v" }}
          target={<CopyToSelection />}
        />
        <Action.Push
          icon={Icon.ArrowRightCircle}
          title="Move All to Finder Selection…"
          shortcut={{ modifiers: ["cmd", "shift"], key: "m" }}
          target={<MoveToSelection />}
        />
        <Action.Push
          icon={Icon.Pencil}
          title="Rename All…"
          shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
          target={<RenameShelf items={items} onComplete={loadItems} />}
        />
        {staleItems.length > 0 ? (
          <Action
            icon={Icon.Warning}
            title={`Remove Stale Items (${staleItems.length})`}
            style={Action.Style.Destructive}
            onAction={handleRemoveStale}
          />
        ) : null}
        <Action
          icon={Icon.XMarkCircle}
          title="Clear Shelf"
          style={Action.Style.Destructive}
          shortcut={{ modifiers: ["cmd", "shift"], key: "delete" }}
          onAction={handleClear}
        />
      </ActionPanel.Section>
    </ActionPanel>
  );

  if (items.length === 0 && !isLoading) {
    return (
      <List>
        <List.EmptyView
          icon={Icon.Tray}
          title="Shelf is Empty"
          description="Select files in Finder and use 'Add to Shelf' to get started"
        />
      </List>
    );
  }

  return (
    <List
      isLoading={isLoading}
      isShowingDetail={isShowingDetail}
      searchBarPlaceholder={`Search ${items.length} item${items.length !== 1 ? "s" : ""} on shelf...`}
    >
      {staleItems.length > 0 ? (
        <List.Section title="Stale Items Warning">
          <List.Item
            icon={{ source: Icon.Warning, tintColor: Color.Red }}
            title={`You have ${staleItems.length} stale item${staleItems.length !== 1 ? "s" : ""} (moved or deleted)`}
            subtitle="Press Enter to remove them from Shelf"
            actions={
              <ActionPanel>
                <Action
                  icon={Icon.Trash}
                  title="Remove Stale Items"
                  style={Action.Style.Destructive}
                  onAction={handleRemoveStale}
                />
              </ActionPanel>
            }
          />
        </List.Section>
      ) : null}
      {groupedItems.map(([folderPath, folderItems]) => (
        <List.Section
          key={folderPath}
          title={basename(folderPath)}
          subtitle={`${folderPath}${folderItems.some((item) => item.isStale) ? " • Stale items" : ""}`}
        >
          {folderItems.map((item) => (
            <List.Item
              key={item.id}
              icon={item.isStale ? { source: getFileIcon(item), tintColor: Color.Red } : getFileIcon(item)}
              title={item.name}
              accessories={
                isShowingDetail
                  ? undefined
                  : [
                      ...(item.isStale
                        ? [
                            {
                              icon: Icon.Warning,
                              text: item.staleReason === "inaccessible" ? "Inaccessible" : "Missing",
                            },
                          ]
                        : []),
                      { text: getFileCategory(item) },
                    ]
              }
              detail={<ItemDetail stats={stats} />}
              actions={getItemActions(item)}
            />
          ))}
        </List.Section>
      ))}
    </List>
  );
}

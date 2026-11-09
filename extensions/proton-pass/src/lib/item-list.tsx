import { Action, ActionPanel, Icon, Image, Keyboard, List, getPreferenceValues } from "@raycast/api";
import { useCachedState, useFrecencySorting } from "@raycast/utils";
import { MutableRefObject, ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FolderEntry, folderEntryValue, InsideFolder } from "./folders";
import { formatTypeLabel, hostnameOf, itemKey } from "./format";
import { ItemActions } from "./item-actions";
import { ItemDetailPanel } from "./item-detail-panel";
import { ItemDetailStore, useItemDetail } from "./item-detail-store";
import { getListIcon } from "./item-icon";
import { formatItemCount } from "./item-counts";
import { platformShortcut } from "./shortcuts";
import { SortOrder, compareNames, preferredSortOrder, sortItems } from "./sort";
import { Item } from "./types";
import { getTotpRemainingSeconds, totpCircle, totpProgressIcon, totpTimerColor } from "./utils";

/**
 * Seconds left in the current 30-second TOTP period, for the items' progress circles. Updated only when the circle
 * changes step or color, not every second, so that the list isn't redrawn for nothing.
 */
function useTotpSeconds(isCounting: boolean): number {
  const [seconds, setSeconds] = useState(getTotpRemainingSeconds);
  useEffect(() => {
    if (!isCounting) return;
    const timer = setInterval(() => {
      const next = getTotpRemainingSeconds();
      const look = (seconds: number) => `${totpCircle(seconds, 30)} ${totpTimerColor(seconds)}`;
      setSeconds((previous) => (look(previous) === look(next) ? previous : next));
    }, 1000);
    return () => clearInterval(timer);
  }, [isCounting]);
  return seconds;
}

function getKeywords(item: Item): string[] {
  return [item.username, item.email, ...(item.urls ?? []).map(hostnameOf)].filter((value): value is string =>
    Boolean(value),
  );
}

export interface ItemListProps {
  items: Item[];
  /** Shown before the items, e.g. the folders of the vault opened. */
  folders?: FolderEntry[];
  /** The view a folder opens on. */
  openFolder?: (folder: FolderEntry) => ReactNode;
  /** What each folder holds, shown next to the list while it's selected (see insideFolders). */
  insideFolders?: Map<string, InsideFolder>;
  navigationTitle?: string;
  /** Shown first, in their own section, e.g. logins matching the active browser tab. */
  suggestedItems?: Item[];
  suggestionsTitle?: string;
  isLoading: boolean;
  searchBarAccessory?: List.Props["searchBarAccessory"];
  emptyView: { icon: Image.ImageLike; title: string; description: string; onRetry?: () => void };
  onRefresh?: () => void;
  /** The order chosen with Sort by, kept for the other lists opened from the same window. */
  sortChoice?: MutableRefObject<SortOrder>;
}

export function ItemList({
  items,
  folders = [],
  openFolder,
  insideFolders,
  navigationTitle,
  suggestedItems = [],
  suggestionsTitle = "Suggested",
  isLoading,
  searchBarAccessory,
  emptyView,
  onRefresh,
  sortChoice,
}: ItemListProps) {
  const showWebsiteIcons = getPreferenceValues<Preferences>().showWebsiteIcons ?? false;
  const [isShowingDetail, setIsShowingDetail] = useCachedState("show-item-details", true);
  // A new store whenever the list is refreshed, so loaded details are never older than the items.
  const store = useMemo(() => new ItemDetailStore(), [items]);
  const [sortOrder, setSortOrder] = useState(() => sortChoice?.current ?? preferredSortOrder());
  // The folders' items are ranked with the list's, so that a folder shows them in the order it opens on.
  const folderItems = useMemo(
    () => Array.from(insideFolders?.values() ?? []).flatMap((inside) => inside.items),
    [insideFolders],
  );
  const rankedItems = useMemo(
    () => (folderItems.length > 0 ? [...items, ...folderItems] : items),
    [items, folderItems],
  );
  // Items never used from Raycast come after the others, by name.
  const { data: mostUsed, visitItem } = useFrecencySorting(rankedItems, {
    key: itemKey,
    namespace: "items",
    sortUnvisited: compareNames,
  });
  const inSortOrder = useCallback(
    (subset: Item[]) => {
      if (sortOrder !== "mostUsed") return sortItems(subset, sortOrder, []);
      const keys = new Set(subset.map(itemKey));
      return mostUsed.filter((item) => keys.has(itemKey(item)));
    },
    [sortOrder, mostUsed],
  );
  const sortedItems = useMemo(() => inSortOrder(items), [inSortOrder, items]);
  const onSortOrderChange = useCallback(
    (order: SortOrder) => {
      if (sortChoice) sortChoice.current = order;
      setSortOrder(order);
    },
    [sortChoice],
  );
  const [selectedKey, setSelectedKey] = useState<string | null>();
  const totpSeconds = useTotpSeconds(items.some((item) => item.hasTotp));

  const suggestedKeys = useMemo(() => new Set(suggestedItems.map(itemKey)), [suggestedItems]);
  const suggested = sortedItems.filter((item) => suggestedKeys.has(itemKey(item)));
  const others = suggested.length > 0 ? sortedItems.filter((item) => !suggestedKeys.has(itemKey(item))) : sortedItems;
  // Until Raycast reports a selection, the first row shown is the selected one, which can be a folder.
  const firstItem = suggested[0] ?? (folders.length > 0 ? undefined : others[0]);
  const folderKeys = useMemo(() => new Set(folders.map(folderEntryValue)), [folders]);
  const selectedItem = useMemo(
    () =>
      selectedKey === null || (selectedKey !== undefined && folderKeys.has(selectedKey))
        ? undefined
        : (items.find((item) => itemKey(item) === selectedKey) ?? firstItem),
    [items, selectedKey, firstItem, folderKeys],
  );
  const activeKey = selectedItem ? itemKey(selectedItem) : undefined;
  // Decided when the list first shows items: its first suggestion, if any, so that a suggestion showing up later
  // (e.g. after a refresh) never moves the cursor.
  const initialSelection = useRef<string | null | undefined>(undefined);
  if (initialSelection.current === undefined && items.length > 0) {
    initialSelection.current = suggested[0] ? itemKey(suggested[0]) : null;
  }
  // Once Raycast reports that selection, the selection is left to Raycast: setting it on every move made Raycast
  // recentre the list each time, which flickered.
  const [isInitialSelectionApplied, setIsInitialSelectionApplied] = useState(false);
  const onSelectionChange = useCallback((id: string | null) => {
    if (id !== null && id === initialSelection.current) setIsInitialSelectionApplied(true);
    setSelectedKey(id);
  }, []);
  // Hidden details do not fetch secrets; copy actions can load them on demand.
  const {
    detail: visibleDetail,
    error,
    isLoading: isLoadingDetail,
  } = useItemDetail(store, isShowingDetail ? selectedItem : undefined);
  const detail = visibleDetail ?? (selectedItem ? store.peek(selectedItem) : undefined);

  const icons = useMemo(
    () => new Map(items.map((item) => [itemKey(item), getListIcon(item, showWebsiteIcons)])),
    [items, showWebsiteIcons],
  );
  const toggleDetail = useCallback(() => setIsShowingDetail((value) => !value), [setIsShowingDetail]);
  const onUse = useCallback((item: Item) => void visitItem(item), [visitItem]);

  /** The folder's subfolders, then its items, as the folder shows them once opened. */
  function renderInsideFolder(folder: FolderEntry) {
    const inside = insideFolders?.get(folderEntryValue(folder));
    if (!inside) return undefined;
    if (inside.folders.length === 0 && inside.items.length === 0) return <List.Item.Detail markdown="Empty folder" />;
    return (
      <List.Item.Detail
        metadata={
          <List.Item.Detail.Metadata>
            {inside.folders.map((subfolder) => (
              <List.Item.Detail.Metadata.Label
                key={folderEntryValue(subfolder)}
                title={subfolder.path[subfolder.path.length - 1].name}
                icon={Icon.Folder}
                text={formatItemCount(subfolder.itemCount)}
              />
            ))}
            {inSortOrder(inside.items).map((item) => (
              <List.Item.Detail.Metadata.Label
                key={itemKey(item)}
                title={item.title}
                icon={getListIcon(item, showWebsiteIcons)}
                text={item.username ?? item.email ?? formatTypeLabel(item.type)}
              />
            ))}
          </List.Item.Detail.Metadata>
        }
      />
    );
  }

  function renderFolder(folder: FolderEntry) {
    const name = folder.path[folder.path.length - 1].name;
    return (
      <List.Item
        key={folderEntryValue(folder)}
        id={folderEntryValue(folder)}
        icon={Icon.Folder}
        title={name}
        accessories={[{ text: formatItemCount(folder.itemCount) }]}
        detail={isShowingDetail ? renderInsideFolder(folder) : undefined}
        actions={
          <ActionPanel>
            {openFolder && <Action.Push title="Open Folder" icon={Icon.Folder} target={openFolder(folder)} />}
            <Action.CopyToClipboard title="Copy Folder Name" content={name} shortcut={Keyboard.Shortcut.Common.Copy} />
            <ActionPanel.Section>
              <Action
                title={isShowingDetail ? "Hide Details" : "Show Details"}
                icon={Icon.AppWindowSidebarRight}
                shortcut={platformShortcut(["cmd"], "d")}
                onAction={toggleDetail}
              />
              {onRefresh && (
                <Action
                  title="Refresh Items"
                  icon={Icon.ArrowClockwise}
                  shortcut={Keyboard.Shortcut.Common.Refresh}
                  onAction={onRefresh}
                />
              )}
            </ActionPanel.Section>
          </ActionPanel>
        }
      />
    );
  }

  function renderItem(item: Item) {
    const key = itemKey(item);
    const isSelected = key === activeKey;
    return (
      <List.Item
        key={key}
        id={key}
        icon={icons.get(key)}
        title={item.title}
        subtitle={isShowingDetail ? undefined : (item.username ?? item.email)}
        keywords={getKeywords(item)}
        accessories={[
          ...(item.hasNote ? [{ icon: Icon.Document, tooltip: "Has a note" }] : []),
          ...(item.hasTotp
            ? [{ icon: totpProgressIcon(totpSeconds, 30, totpTimerColor(totpSeconds)), tooltip: "Has a TOTP code" }]
            : []),
          ...(isShowingDetail ? [] : [{ text: item.vaultName }]),
        ]}
        detail={
          isShowingDetail ? (
            <ItemDetailPanel
              item={item}
              detail={isSelected ? detail : undefined}
              isLoading={isSelected && isLoadingDetail}
              error={isSelected ? error : undefined}
            />
          ) : undefined
        }
        actions={
          <ItemActions
            item={item}
            detail={isSelected ? detail : undefined}
            store={store}
            isShowingDetail={isShowingDetail}
            onToggleDetail={toggleDetail}
            onRefresh={onRefresh}
            onUse={onUse}
            sortOrder={sortOrder}
            onSortOrderChange={onSortOrderChange}
          />
        }
      />
    );
  }

  return (
    <List
      navigationTitle={navigationTitle}
      isLoading={isLoading}
      isShowingDetail={isShowingDetail && (items.length > 0 || folders.length > 0)}
      searchBarPlaceholder="Search by name, username or website…"
      filtering={true}
      selectedItemId={isInitialSelectionApplied ? undefined : (initialSelection.current ?? undefined)}
      onSelectionChange={onSelectionChange}
      searchBarAccessory={searchBarAccessory}
    >
      {items.length === 0 && folders.length === 0 && !isLoading ? (
        <List.EmptyView
          icon={emptyView.icon}
          title={emptyView.title}
          description={emptyView.description}
          actions={
            emptyView.onRetry ? (
              <ActionPanel>
                <Action title="Retry" icon={Icon.ArrowClockwise} onAction={emptyView.onRetry} />
              </ActionPanel>
            ) : undefined
          }
        />
      ) : suggested.length > 0 || folders.length > 0 ? (
        <>
          {suggested.length > 0 && <List.Section title={suggestionsTitle}>{suggested.map(renderItem)}</List.Section>}
          {folders.length > 0 && <List.Section title="Folders">{folders.map(renderFolder)}</List.Section>}
          <List.Section title={folders.length > 0 ? "Items" : "All Items"}>{others.map(renderItem)}</List.Section>
        </>
      ) : (
        others.map(renderItem)
      )}
    </List>
  );
}

import { Icon, Image, List, getPreferenceValues } from "@raycast/api";
import { getFavicon, useCachedState, useFrecencySorting } from "@raycast/utils";
import { useCallback, useMemo, useRef, useState } from "react";
import { getInitialIconDataUri } from "./avatar";
import { hostnameOf, itemKey, toOpenableUrl } from "./format";
import { ItemActions } from "./item-actions";
import { ItemDetailPanel } from "./item-detail-panel";
import { ItemDetailStore, useItemDetail } from "./item-detail-store";
import { Item } from "./types";
import { getItemIcon } from "./utils";

function getListIcon(item: Item, showWebsiteIcons: boolean): Image.ImageLike {
  if (item.type !== "login") return getItemIcon(item.type);
  const initials = getInitialIconDataUri(item.title);
  const url = item.urls?.[0];
  // Website icons come from the favicon provider set in Raycast, which receives the domain, so they're opt-in.
  return showWebsiteIcons && url
    ? getFavicon(toOpenableUrl(url), { fallback: initials, mask: Image.Mask.RoundedRectangle })
    : { source: initials, fallback: getItemIcon(item.type) };
}

function getKeywords(item: Item): string[] {
  return [item.username, item.email, ...(item.urls ?? []).map(hostnameOf)].filter((value): value is string =>
    Boolean(value),
  );
}

export interface ItemListProps {
  items: Item[];
  /** Shown first, in their own section, e.g. logins matching the active browser tab. */
  suggestedItems?: Item[];
  suggestionsTitle?: string;
  isLoading: boolean;
  navigationTitle?: string;
  searchBarAccessory?: List.Props["searchBarAccessory"];
  emptyView: { icon: Image.ImageLike; title: string; description: string };
  onRefresh?: () => void;
}

export function ItemList({
  items,
  suggestedItems = [],
  suggestionsTitle = "Suggested",
  isLoading,
  navigationTitle,
  searchBarAccessory,
  emptyView,
  onRefresh,
}: ItemListProps) {
  const showWebsiteIcons = getPreferenceValues<Preferences>().showWebsiteIcons ?? false;
  const [isShowingDetail, setIsShowingDetail] = useCachedState("show-item-details", true);
  // A new store whenever the list is refreshed, so loaded details are never older than the items.
  const store = useMemo(() => new ItemDetailStore(), [items]);
  const { data: sortedItems, visitItem } = useFrecencySorting(items, { key: itemKey, namespace: "items" });
  const [selectedKey, setSelectedKey] = useState<string>();

  const suggestedKeys = useMemo(() => new Set(suggestedItems.map(itemKey)), [suggestedItems]);
  const suggested = sortedItems.filter((item) => suggestedKeys.has(itemKey(item)));
  const others = suggested.length > 0 ? sortedItems.filter((item) => !suggestedKeys.has(itemKey(item))) : sortedItems;
  // Until Raycast reports a selection, the first item shown is the selected one.
  const firstItem = suggested[0] ?? others[0];
  const activeKey = selectedKey ?? (firstItem ? itemKey(firstItem) : undefined);
  const selectedItem = useMemo(() => items.find((item) => itemKey(item) === activeKey), [items, activeKey]);
  // Loaded even when the panel is hidden: the actions need it for custom fields.
  const { detail, error, isLoading: isLoadingDetail } = useItemDetail(store, selectedItem);
  // The first suggestion is selected when the list appears; after that, the selection only moves with the user.
  const initialSelection = useRef<string | undefined>(undefined);
  if (initialSelection.current === undefined && suggested[0]) initialSelection.current = itemKey(suggested[0]);

  const icons = useMemo(
    () => new Map(items.map((item) => [itemKey(item), getListIcon(item, showWebsiteIcons)])),
    [items, showWebsiteIcons],
  );
  const toggleDetail = useCallback(() => setIsShowingDetail((value) => !value), [setIsShowingDetail]);
  const onUse = useCallback((item: Item) => void visitItem(item), [visitItem]);

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
          ...(item.hasTotp ? [{ icon: Icon.Clock, tooltip: "Has a 2FA code" }] : []),
          ...(isShowingDetail ? [] : [{ text: item.vaultName }]),
        ]}
        detail={
          <ItemDetailPanel
            item={item}
            detail={isSelected ? detail : undefined}
            isLoading={isSelected && isLoadingDetail}
            error={isSelected ? error : undefined}
          />
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
          />
        }
      />
    );
  }

  return (
    <List
      isLoading={isLoading}
      isShowingDetail={isShowingDetail && items.length > 0}
      navigationTitle={navigationTitle}
      searchBarPlaceholder="Search by name, username or website…"
      filtering={true}
      selectedItemId={initialSelection.current}
      onSelectionChange={(id) => setSelectedKey(id ?? undefined)}
      searchBarAccessory={searchBarAccessory}
    >
      {items.length === 0 && !isLoading ? (
        <List.EmptyView icon={emptyView.icon} title={emptyView.title} description={emptyView.description} />
      ) : suggested.length > 0 ? (
        <>
          <List.Section title={suggestionsTitle}>{suggested.map(renderItem)}</List.Section>
          <List.Section title="All Items">{others.map(renderItem)}</List.Section>
        </>
      ) : (
        others.map(renderItem)
      )}
    </List>
  );
}

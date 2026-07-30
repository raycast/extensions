import { useMemo, useState } from "react";
import { Action, ActionPanel, getPreferenceValues, Icon, List } from "@raycast/api";
import { CATEGORIES, CATEGORY_ORDER } from "../data/categories";
import { cheatsheetItems } from "../data";
import { useCatalogHistory } from "../hooks/useCatalogHistory";
import { getExamples, getPrimarySelection } from "../lib/examples";
import { filterItems } from "../lib/filter";
import { createItemPreviewMarkdown } from "../lib/markdown";
import { getRelatedItems } from "../lib/related";
import type { CategoryFilter, CheatsheetItem, ExtensionPreferences } from "../types";
import { ItemActions } from "./ItemActions";
import { ItemMetadata } from "./ItemMetadata";

interface CommandRowProps {
  item: CheatsheetItem;
  rowId: string;
  searchText: string;
  preferences: ExtensionPreferences;
  relatedItems: CheatsheetItem[];
  isFavorite: boolean;
  isShowingDetail: boolean;
  onToggleFavorite: (id: string) => void;
  onToggleDetail: () => void;
  onUse: (id: string) => void;
}

function CommandRow({
  item,
  rowId,
  searchText,
  preferences,
  relatedItems,
  isFavorite,
  isShowingDetail,
  onToggleFavorite,
  onToggleDetail,
  onUse,
}: CommandRowProps) {
  const primarySelection = getPrimarySelection(item, searchText, preferences);

  return (
    <List.Item
      id={rowId}
      title={primarySelection.content}
      subtitle={item.description}
      keywords={[...item.tags, ...(item.aliases ?? [])]}
      detail={
        <List.Item.Detail
          markdown={createItemPreviewMarkdown(item, { effectiveCommand: primarySelection.content })}
          metadata={
            <ItemMetadata item={item} relatedItems={relatedItems} effectiveCommand={primarySelection.content} />
          }
        />
      }
      actions={
        <ItemActions
          item={item}
          searchText={searchText}
          preferences={preferences}
          relatedItems={relatedItems}
          isFavorite={isFavorite}
          isShowingDetail={isShowingDetail}
          onToggleFavorite={onToggleFavorite}
          onToggleDetail={onToggleDetail}
          onUse={onUse}
        />
      }
    />
  );
}

export function CheatsheetList() {
  const preferences = getPreferenceValues<ExtensionPreferences>();
  const [category, setCategory] = useState<CategoryFilter>("all");
  const [searchText, setSearchText] = useState("");
  const [isShowingDetail, setIsShowingDetail] = useState(preferences.showDetailPreview);
  const { favoriteIds, recentIds, toggleFavorite, recordRecent } = useCatalogHistory();

  const searchableItems = useMemo(
    () =>
      cheatsheetItems.map((item) => ({
        ...item,
        examples: getExamples(item, {
          preferredModel: preferences.preferredModel,
          preferredProvider: preferences.preferredProvider,
        }),
      })),
    [preferences.preferredModel, preferences.preferredProvider],
  );
  const visibleItems = useMemo(
    () => filterItems(searchableItems, category, searchText),
    [category, searchText, searchableItems],
  );
  const itemById = useMemo(() => new Map(cheatsheetItems.map((item) => [item.id, item])), []);
  const relatedItemsById = useMemo(
    () => new Map(cheatsheetItems.map((item) => [item.id, getRelatedItems(item, cheatsheetItems)])),
    [],
  );
  const favoriteIdSet = useMemo(() => new Set(favoriteIds), [favoriteIds]);
  const showQuickSections = category === "all" && !searchText;
  const favoriteItems = showQuickSections
    ? favoriteIds.map((id) => itemById.get(id)).filter((item): item is CheatsheetItem => Boolean(item))
    : [];
  const recentItems = showQuickSections
    ? recentIds
        .filter((id) => !favoriteIdSet.has(id))
        .map((id) => itemById.get(id))
        .filter((item): item is CheatsheetItem => Boolean(item))
    : [];
  const quickItemIds = useMemo(
    () => new Set(showQuickSections ? [...favoriteIds, ...recentIds] : []),
    [favoriteIds, recentIds, showQuickSections],
  );

  const groupedItems = useMemo(
    () =>
      CATEGORY_ORDER.map((categoryId) => ({
        categoryId,
        items: visibleItems.filter((item) => item.category === categoryId && !quickItemIds.has(item.id)),
      })).filter((section) => section.items.length > 0),
    [quickItemIds, visibleItems],
  );

  const row = (item: CheatsheetItem, prefix: string) => (
    <CommandRow
      key={`${prefix}-${item.id}`}
      rowId={`${prefix}-${item.id}`}
      item={item}
      searchText={searchText}
      preferences={preferences}
      relatedItems={relatedItemsById.get(item.id) ?? []}
      isFavorite={favoriteIdSet.has(item.id)}
      isShowingDetail={isShowingDetail}
      onToggleFavorite={toggleFavorite}
      onToggleDetail={() => setIsShowingDetail((current) => !current)}
      onUse={recordRecent}
    />
  );

  return (
    <List
      filtering={false}
      searchText={searchText}
      searchBarPlaceholder="Search Hermes commands, flags, shortcuts…"
      onSearchTextChange={setSearchText}
      isShowingDetail={isShowingDetail}
      searchBarAccessory={
        <List.Dropdown
          tooltip="Select Category"
          value={category}
          onChange={(value) => setCategory(value as CategoryFilter)}
        >
          <List.Dropdown.Item title={`All Categories (${cheatsheetItems.length})`} value="all" icon={Icon.List} />
          {CATEGORY_ORDER.map((categoryId) => {
            const categoryInfo = CATEGORIES[categoryId];
            const count = cheatsheetItems.filter((item) => item.category === categoryId).length;
            return (
              <List.Dropdown.Item
                key={categoryId}
                title={`${categoryInfo.title} (${count})`}
                value={categoryId}
                icon={categoryInfo.icon}
              />
            );
          })}
        </List.Dropdown>
      }
    >
      {favoriteItems.length ? (
        <List.Section title="Favorites" subtitle={`${favoriteItems.length}`}>
          {favoriteItems.map((item) => row(item, "favorite"))}
        </List.Section>
      ) : null}
      {recentItems.length ? (
        <List.Section title="Recently Used" subtitle={`${recentItems.length}`}>
          {recentItems.map((item) => row(item, "recent"))}
        </List.Section>
      ) : null}
      {groupedItems.length ? (
        groupedItems.map(({ categoryId, items }) => (
          <List.Section key={categoryId} title={CATEGORIES[categoryId].title} subtitle={`${items.length}`}>
            {items.map((item) => row(item, categoryId))}
          </List.Section>
        ))
      ) : !favoriteItems.length && !recentItems.length ? (
        <List.EmptyView
          icon={Icon.MagnifyingGlass}
          title="No Hermes Commands Found"
          description="Clear the search or show all categories to return to the catalog."
          actions={
            <ActionPanel>
              {searchText ? (
                <Action title="Clear Search" icon={Icon.XMarkCircle} onAction={() => setSearchText("")} />
              ) : null}
              {category !== "all" ? (
                <Action title="Show All Categories" icon={Icon.List} onAction={() => setCategory("all")} />
              ) : null}
              <Action.OpenInBrowser
                title="Open Hermes Documentation"
                url="https://hermes-agent.nousresearch.com/docs/"
                icon={Icon.Book}
              />
            </ActionPanel>
          }
        />
      ) : null}
    </List>
  );
}

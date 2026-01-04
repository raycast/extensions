/**
 * Main search grid component
 */
import { Action, ActionPanel, getPreferenceValues, Grid, Icon } from "@raycast/api";
import { useMemo, useState } from "react";
import { type Category, GENERATED_CATEGORY, type ItemActionHandlers, type Preferences } from "../../types";
import { useArts, useCustomArts, useFavorites, useFilters, useSearchActions, useSearchData } from "../../hooks";
import { getCategoryLabel, getSearchPlaceholder, t, UI_CONFIG, URLS } from "../../constants";
import { SearchItem } from "./SearchItem";

export function SearchView() {
  const preferences = getPreferenceValues<Preferences>();
  const gridColumns = parseInt(preferences.gridColumns, 10) || UI_CONFIG.defaultGridColumns;
  const [searchText, setSearchText] = useState("");

  // Data fetching
  const { apiArts, isLoading: artsLoading } = useArts();
  const { customArtsAsKaomoji, isLoading: customArtsLoading, removeCustomArt, isCustomArt } = useCustomArts();

  // Merge API arts with custom arts (custom arts first)
  const allKaomoji = useMemo(() => {
    return [...customArtsAsKaomoji, ...apiArts];
  }, [customArtsAsKaomoji, apiArts]);

  // Favorites management
  const { favorites, toggleFavorite, isFavorite, isLoading: favoritesLoading } = useFavorites();

  // Filter management
  const {
    selectedType,
    selectedCategory,
    isLoaded: filtersLoaded,
    availableCategories,
    setSelectedCategory,
    toggleType,
  } = useFilters(allKaomoji);

  // Data processing (filtering, sorting, grouping)
  const { favoriteItems, otherItems, itemsByCategory, visitItem } = useSearchData({
    allKaomoji,
    searchText,
    selectedType,
    selectedCategory,
    filtersLoaded,
    favorites,
    isFavorite,
    availableCategories,
  });

  // Action handlers
  const { handleCopy, handlePaste, handlePasteKeepOpen, handleCopyUnicode, handleCopyAllFromSection } =
    useSearchActions({ visitItem });

  const handlers: ItemActionHandlers = {
    onCopy: handleCopy,
    onPaste: handlePaste,
    onPasteKeepOpen: handlePasteKeepOpen,
    onCopyUnicode: handleCopyUnicode,
    onCopyAllFromSection: handleCopyAllFromSection,
    onToggleFavorite: toggleFavorite,
    onToggleType: toggleType,
    onRemoveCustomArt: removeCustomArt,
    isCustomArt,
  };

  const isLoading = artsLoading || customArtsLoading || favoritesLoading || !filtersLoaded;

  // Calculate total displayed items for empty view check
  const displayedItems = useMemo(() => {
    if (selectedCategory === "all") {
      const categoryItems = availableCategories.flatMap((cat) => itemsByCategory[cat] ?? []);
      return [...favoriteItems, ...categoryItems];
    }
    return [...favoriteItems, ...otherItems];
  }, [selectedCategory, favoriteItems, otherItems, itemsByCategory, availableCategories]);

  const handleCategoryChange = async (value: string) => {
    await setSelectedCategory(value as Category | "all");
  };

  return (
    <Grid
      columns={gridColumns}
      inset={Grid.Inset.Medium}
      isLoading={isLoading}
      searchBarPlaceholder={getSearchPlaceholder(selectedType)}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      filtering={false}
      searchBarAccessory={
        <Grid.Dropdown tooltip={t("labels.category")} value={selectedCategory} onChange={handleCategoryChange}>
          <Grid.Dropdown.Item title={t("categories.all")} value="all" />
          <Grid.Dropdown.Section title={t("labels.categories")}>
            {availableCategories.map((cat) => (
              <Grid.Dropdown.Item key={cat} title={getCategoryLabel(cat)} value={cat} />
            ))}
          </Grid.Dropdown.Section>
        </Grid.Dropdown>
      }
    >
      {/* Pinned section - always first */}
      {favoriteItems.length > 0 && (
        <Grid.Section title={`${t("labels.pinned")}   ${favoriteItems.length}`}>
          {favoriteItems.map((item) => (
            <SearchItem
              key={item.text}
              item={item}
              isFavorite={true}
              selectedType={selectedType}
              sectionItems={favoriteItems}
              handlers={handlers}
            />
          ))}
        </Grid.Section>
      )}

      {/* Generated section - second */}
      {(itemsByCategory[GENERATED_CATEGORY]?.length ?? 0) > 0 && (
        <Grid.Section title={`${getCategoryLabel(GENERATED_CATEGORY)}   ${itemsByCategory[GENERATED_CATEGORY].length}`}>
          {itemsByCategory[GENERATED_CATEGORY].map((item) => (
            <SearchItem
              key={item.text}
              item={item}
              isFavorite={isFavorite(item.text)}
              selectedType={selectedType}
              sectionItems={itemsByCategory[GENERATED_CATEGORY]}
              handlers={handlers}
            />
          ))}
        </Grid.Section>
      )}

      {selectedCategory === "all" ? (
        // Show sections for each category (excluding generated which is shown above)
        availableCategories
          .filter((cat) => cat !== GENERATED_CATEGORY)
          .map((cat) =>
            (itemsByCategory[cat]?.length ?? 0) > 0 ? (
              <Grid.Section key={cat} title={`${getCategoryLabel(cat)}   ${itemsByCategory[cat].length}`}>
                {itemsByCategory[cat].map((item) => (
                  <SearchItem
                    key={item.text}
                    item={item}
                    isFavorite={false}
                    selectedType={selectedType}
                    sectionItems={itemsByCategory[cat]}
                    handlers={handlers}
                  />
                ))}
              </Grid.Section>
            ) : null,
          )
      ) : (
        // Show single section for selected category
        <Grid.Section title={`${getCategoryLabel(selectedCategory)}   ${otherItems.length}`}>
          {otherItems.map((item) => (
            <SearchItem
              key={item.text}
              item={item}
              isFavorite={false}
              selectedType={selectedType}
              sectionItems={otherItems}
              handlers={handlers}
            />
          ))}
        </Grid.Section>
      )}

      {!isLoading && displayedItems.length === 0 && (
        <Grid.EmptyView
          title={t("labels.noResults")}
          description={t("labels.noResultsDescription")}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser title={t("actions.submitArt")} icon={Icon.Plus} url={URLS.submitArt} />
            </ActionPanel>
          }
        />
      )}
    </Grid>
  );
}

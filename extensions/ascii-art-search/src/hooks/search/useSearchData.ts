/**
 * Hook for managing search data: filtering, sorting, and grouping
 */
import { useFrecencySorting } from "@raycast/utils";
import { useMemo } from "react";
import { type Category, type ItemType, type Kaomoji } from "../../types";
import { STORAGE_KEYS } from "../../constants";

interface UseSearchDataOptions {
  /** All kaomoji items (merged from API and custom) */
  allKaomoji: Kaomoji[];
  searchText: string;
  selectedType: ItemType | "all";
  selectedCategory: Category | "all";
  filtersLoaded: boolean;
  favorites: Set<string>;
  isFavorite: (text: string) => boolean;
  /** Available categories (derived from data) */
  availableCategories: Category[];
}

interface UseSearchDataResult {
  /** Filtered and sorted favorite items */
  favoriteItems: Kaomoji[];
  /** Filtered and sorted non-favorite items */
  otherItems: Kaomoji[];
  /** Items grouped by category (for "all" view) */
  itemsByCategory: Record<Category, Kaomoji[]>;
  /** Record visit for frecency tracking */
  visitItem: (item: Kaomoji) => void;
}

export function useSearchData({
  allKaomoji,
  searchText,
  selectedType,
  selectedCategory,
  filtersLoaded,
  favorites,
  isFavorite,
  availableCategories,
}: UseSearchDataOptions): UseSearchDataResult {
  // Filter by type and category
  const filtered = useMemo(() => {
    if (!filtersLoaded) return [];
    let items = allKaomoji;
    if (selectedType !== "all") {
      items = items.filter((k) => k.type === selectedType);
    }
    if (selectedCategory !== "all") {
      items = items.filter((k) => k.category === selectedCategory);
    }
    return items;
  }, [allKaomoji, selectedType, selectedCategory, filtersLoaded]);

  // Apply frecency sorting
  const { data: frecencySorted, visitItem } = useFrecencySorting(filtered, {
    namespace: STORAGE_KEYS.frecencyNamespace,
    key: (item) => item.text,
    sortUnvisited: (a, b) => {
      const aFav = favorites.has(a.text);
      const bFav = favorites.has(b.text);
      if (aFav && !bFav) return -1;
      if (!aFav && bFav) return 1;
      return 0;
    },
  });

  // Apply search filter
  const displayedItems = useMemo(() => {
    const query = searchText.toLowerCase().trim();
    if (!query) return frecencySorted;

    return frecencySorted.filter((item) => {
      const nameMatch = item.name.ja.toLowerCase().includes(query) || item.name.en.toLowerCase().includes(query);
      const keywordMatch = item.keywords.some((kw) => kw.toLowerCase().includes(query));
      return nameMatch || keywordMatch;
    });
  }, [searchText, frecencySorted]);

  // Separate favorites section
  const favoriteItems = useMemo(() => displayedItems.filter((k) => isFavorite(k.text)), [displayedItems, isFavorite]);

  const otherItems = useMemo(() => displayedItems.filter((k) => !isFavorite(k.text)), [displayedItems, isFavorite]);

  // Group items by category for "all" view
  const itemsByCategory = useMemo(() => {
    const grouped: Record<Category, Kaomoji[]> = {};
    for (const cat of availableCategories) {
      grouped[cat] = otherItems.filter((k) => k.category === cat);
    }
    return grouped;
  }, [otherItems, availableCategories]);

  return {
    favoriteItems,
    otherItems,
    itemsByCategory,
    visitItem,
  };
}

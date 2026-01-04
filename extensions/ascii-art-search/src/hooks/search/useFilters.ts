/**
 * Hook for managing filter state (type and category)
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { type Category, ITEM_TYPES, type ItemType, type Kaomoji } from "../../types";
import { getStoredCategory, getStoredType, setStoredCategory, setStoredType } from "../../lib/storage";

interface UseFiltersResult {
  selectedType: ItemType | "all";
  selectedCategory: Category | "all";
  isLoaded: boolean;
  availableCategories: Category[];
  setSelectedCategory: (category: Category | "all") => Promise<void>;
  toggleType: () => Promise<void>;
}

export function useFilters(allItems: Kaomoji[]): UseFiltersResult {
  const [selectedType, _setSelectedType] = useState<ItemType | "all">("all");
  const [selectedCategory, _setSelectedCategory] = useState<Category | "all">("all");
  const [isLoaded, setIsLoaded] = useState(false);

  // Extract all unique categories from data
  const allCategories = useMemo(() => {
    const cats = new Set<Category>();
    for (const item of allItems) {
      cats.add(item.category);
    }
    return Array.from(cats).sort();
  }, [allItems]);

  // Load persisted filter selections
  useEffect(() => {
    (async () => {
      const [storedType, storedCategory] = await Promise.all([getStoredType(), getStoredCategory(allCategories)]);
      _setSelectedType(storedType);
      _setSelectedCategory(storedCategory);
      setIsLoaded(true);
    })();
  }, [allCategories]);

  // Pre-compute category availability map (O(n) once instead of O(n*m) per render)
  const categoryTypeMap = useMemo(() => {
    const map = new Map<Category, Set<ItemType>>();
    for (const item of allItems) {
      if (!map.has(item.category)) {
        map.set(item.category, new Set());
      }
      map.get(item.category)!.add(item.type);
    }
    return map;
  }, [allItems]);

  // Get categories that have items for the selected type (O(m) using pre-computed map)
  const availableCategories = useMemo(() => {
    return allCategories.filter((cat) => {
      const types = categoryTypeMap.get(cat);
      if (!types) return false;
      if (selectedType === "all") return true;
      return types.has(selectedType);
    });
  }, [allCategories, categoryTypeMap, selectedType]);

  const setSelectedType = useCallback(async (type: ItemType | "all") => {
    _setSelectedType(type);
    await setStoredType(type);
  }, []);

  const setSelectedCategory = useCallback(async (category: Category | "all") => {
    _setSelectedCategory(category);
    await setStoredCategory(category);
  }, []);

  const toggleType = useCallback(async () => {
    const types: (ItemType | "all")[] = ["all", ...ITEM_TYPES];
    const currentIndex = types.indexOf(selectedType);
    const nextType = types[(currentIndex + 1) % types.length];

    await setSelectedType(nextType);

    // Reset category if current one is not available for new type (using pre-computed map)
    if (selectedCategory !== "all") {
      const typesInCategory = categoryTypeMap.get(selectedCategory);
      const hasItemsInCategory = nextType === "all" ? !!typesInCategory : (typesInCategory?.has(nextType) ?? false);
      if (!hasItemsInCategory) {
        await setSelectedCategory("all");
      }
    }
  }, [selectedType, selectedCategory, categoryTypeMap, setSelectedType, setSelectedCategory]);

  return {
    selectedType,
    selectedCategory,
    isLoaded,
    availableCategories,
    setSelectedCategory,
    toggleType,
  };
}

import { useCallback } from "react";
import { useStateAndLocalStorage } from "@/hooks/use-state-and-localstorage";

export type UseItemListParams<T> = {
  key: string;
  comparator: keyof T | ((existingItem: T, itemToAdd: T) => boolean);
  limit: number;
};

interface UseItemListReturn<T> {
  items: T[];
  addItem: (itemToAdd: T) => void;
  removeItem: (itemToRemove: T) => void;
  clearItems: () => void;
  isInList: (item: T) => boolean;
  areItemsLoaded: boolean;
}

/**
 * Generic hook for managing lists of items with local storage persistence
 * Replaces the duplicated logic from useFavorites and useRecentlyUsedItems
 */
export function useItemList<T>(params: UseItemListParams<T>): UseItemListReturn<T> {
  const { key, comparator, limit } = params;

  const [items, setItems, areItemsLoaded] = useStateAndLocalStorage<T[]>(key, []);

  const addItem = useCallback(
    (itemToAdd: T) => {
      setItems((currItems) => {
        const isItemAlreadyInList = currItems.some((existingItem) =>
          typeof comparator === "function"
            ? comparator(existingItem, itemToAdd)
            : existingItem[comparator] === itemToAdd[comparator],
        );
        return isItemAlreadyInList ? currItems : [itemToAdd, ...currItems].slice(0, limit);
      });
    },
    [comparator, limit, setItems],
  );

  const removeItem = useCallback(
    (itemToRemove: T) => {
      setItems((currItems) => {
        const isItemInList = currItems.find((existingItem) =>
          typeof comparator === "function"
            ? comparator(existingItem, itemToRemove)
            : existingItem[comparator] === itemToRemove[comparator],
        );
        return isItemInList
          ? currItems.filter((existingItem) =>
              typeof comparator === "function"
                ? !comparator(existingItem, itemToRemove)
                : existingItem[comparator] !== itemToRemove[comparator],
            )
          : currItems;
      });
    },
    [comparator, setItems],
  );

  const clearItems = useCallback(() => {
    setItems([]);
  }, [setItems]);

  const isInList = useCallback(
    (item: T) => {
      return items.some((listItem) =>
        typeof comparator === "function" ? comparator(listItem, item) : listItem[comparator] === item[comparator],
      );
    },
    [items, comparator],
  );

  return {
    items,
    addItem,
    removeItem,
    clearItems,
    isInList,
    areItemsLoaded,
  };
}

import { useCallback } from "react";

import { useStateAndLocalStorage } from "./use-state-and-localstorage";

interface UseRecentlyUsedParams<T> {
  key: string;
  comparator: keyof T | ((existingItem: T, itemToAdd: T) => boolean);
  limit?: number;
}

export function useRecentlyUsedItems<T>(params: UseRecentlyUsedParams<T>) {
  const { key, comparator, limit = 10 } = params;

  const [recentlyUsedItems, setRecentlyUsedItems, areRecentlyUsedItemsLoaded] = useStateAndLocalStorage<T[]>(key, []);

  const addToRecentlyUsedItems = useCallback(
    (itemToAdd: T) => {
      setRecentlyUsedItems((currRecentlyUsedItems) => {
        const isItemToAddAlreadyInRecentlyUsedList = currRecentlyUsedItems.some((existingItem) =>
          typeof comparator === "function"
            ? comparator(existingItem, itemToAdd)
            : existingItem[comparator] === itemToAdd[comparator],
        );
        return isItemToAddAlreadyInRecentlyUsedList
          ? currRecentlyUsedItems
          : [itemToAdd, ...currRecentlyUsedItems].slice(0, limit);
      });
    },
    [comparator, limit],
  );

  const removeFromRecentlyUsedItems = useCallback(
    (itemToRemove: T) => {
      setRecentlyUsedItems((currRecentlyUsedItems) => {
        const isItemToRemoveInRecentlyUsedList = currRecentlyUsedItems.find((existingItem) =>
          typeof comparator === "function"
            ? comparator(existingItem, itemToRemove)
            : existingItem[comparator] === itemToRemove[comparator],
        );
        return isItemToRemoveInRecentlyUsedList
          ? currRecentlyUsedItems.filter((existingItem) =>
              typeof comparator === "function"
                ? !comparator(existingItem, itemToRemove)
                : existingItem[comparator] !== itemToRemove[comparator],
            )
          : currRecentlyUsedItems;
      });
    },
    [comparator],
  );

  const clearRecentlyUsedItems = useCallback(() => {
    setRecentlyUsedItems([]);
  }, [comparator, limit]);

  return {
    recentlyUsedItems,
    addToRecentlyUsedItems,
    areRecentlyUsedItemsLoaded,
    clearRecentlyUsedItems,
    removeFromRecentlyUsedItems,
  };
}

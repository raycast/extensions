import type { Dispatch, SetStateAction } from "react";
import { useCallback, useEffect, useState } from "react";

import { LocalStorage } from "@raycast/api";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const useStateAndLocalStorage = <T, _ = void>(
  key: string,
  initialValue: T,
): [T, Dispatch<SetStateAction<T>>, boolean] => {
  const [state, setState] = useState<T>(initialValue);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // FIXME In the future version, we don't need didUnmount checking
    // https://github.com/facebook/react/pull/22114
    let didUnmount = false;

    (async () => {
      const cache = await LocalStorage.getItem(key);

      if (typeof cache === "string") {
        if (!didUnmount) {
          setState(JSON.parse(cache));
          setReady(true);
        }
      } else {
        if (!didUnmount) {
          setReady(true);
        }
      }
    })();

    return () => {
      didUnmount = true;
    };
  }, []);

  // @ts-expect-error TS struggles to infer the types as T could potentially be a function
  const setStateAndLocalStorage = useCallback((updater) => {
    setState((state) => {
      const newValue = typeof updater === "function" ? updater(state) : updater;
      LocalStorage.setItem(key, JSON.stringify(newValue));
      return newValue;
    });
  }, []);

  return [state, setStateAndLocalStorage, ready];
};

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
        const isItemToAddAlreadyInRecentlyUsedList = currRecentlyUsedItems.find((existingItem) =>
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

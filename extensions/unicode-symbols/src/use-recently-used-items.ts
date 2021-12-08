import { getLocalStorageItem, setLocalStorageItem } from "@raycast/api";
import { Dispatch, SetStateAction, useCallback, useEffect, useState } from "react";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const useStateAndLocalStorage = <T, _ = void>(
  key: string,
  initialValue: T
): [T, Dispatch<SetStateAction<T>>, boolean] => {
  const [state, setState] = useState<T>(initialValue);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // FIXME In the future version, we don't need didUnmount checking
    // https://github.com/facebook/react/pull/22114
    let didUnmount = false;

    (async () => {
      const cache = await getLocalStorageItem(key);

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

  const setStateAndLocalStorage = useCallback((updater) => {
    setState((state) => {
      const newValue = typeof updater === "function" ? updater(state) : updater;
      setLocalStorageItem(key, JSON.stringify(newValue));
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
            : existingItem[comparator] === itemToAdd[comparator]
        );
        return isItemToAddAlreadyInRecentlyUsedList
          ? currRecentlyUsedItems
          : [itemToAdd, ...currRecentlyUsedItems].slice(0, limit);
      });
    },
    [comparator, limit]
  );

  const clearRecentlyUsedItems = useCallback(() => {
    setRecentlyUsedItems([]);
  }, [comparator, limit]);

  return {
    recentlyUsedItems,
    addToRecentlyUsedItems,
    areRecentlyUsedItemsLoaded,
    clearRecentlyUsedItems,
  };
}

import { useState } from "react";
import { HistoryItem, UseColorsSelectionObject } from "../lib/types";

type UseSelectionReturn<T> = {
  selection: UseColorsSelectionObject<T>;
};

export function useColorsSelection<T = string | HistoryItem>(
  items: T[],
  getKey?: (item: T) => string,
): UseSelectionReturn<T> {
  const [selectedItems, setSelectedItems] = useState<T[]>([]);

  const computeKey = (i: T): string => (getKey ? getKey(i) : (i as unknown as string));

  const toggleSelection = (item: T) => {
    setSelectedItems((prev) => {
      const itemKey = computeKey(item);
      return prev.some((i) => computeKey(i) === itemKey)
        ? prev.filter((i) => computeKey(i) !== itemKey)
        : [...prev, item];
    });
  };

  const selectAll = () => setSelectedItems([...items]);
  const clearSelection = () => setSelectedItems([]);

  const getIsItemSelected = (item: T) => {
    const itemKey = computeKey(item);
    return selectedItems.some((i) => computeKey(i) === itemKey);
  };

  return {
    selection: {
      actions: { toggleSelection, selectAll, clearSelection },
      selected: {
        selectedItems,
        anySelected: selectedItems.length > 0,
        allSelected: items.length > 0 && items.every(getIsItemSelected),
        countSelected: selectedItems.length,
      },
      helpers: { getIsItemSelected },
    },
  };
}

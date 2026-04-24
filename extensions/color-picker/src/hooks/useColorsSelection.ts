import { useState } from "react";
import { HistoryItem, UseColorsSelectionObject } from "../lib/types";

type UseSelectionReturn<T> = {
  selection: UseColorsSelectionObject<T>;
};

export function useColorsSelection<T = string | HistoryItem>(items: T[]): UseSelectionReturn<T> {
  const [selectedItems, setSelectedItems] = useState<T[]>([]);

  const toggleSelection = (item: T) => {
    setSelectedItems((prev) => (prev.includes(item) ? prev.filter((i) => i !== item) : [...prev, item]));
  };

  const selectAll = () => setSelectedItems([...items]);
  const clearSelection = () => setSelectedItems([]);
  const getIsItemSelected = (item: T) => selectedItems.includes(item);

  return {
    selection: {
      actions: { toggleSelection, selectAll, clearSelection },
      selected: {
        selectedItems,
        anySelected: selectedItems.length > 0,
        allSelected: items.length > 0 && selectedItems.length === items.length,
        countSelected: selectedItems.length,
      },
      helpers: { getIsItemSelected },
    },
  };
}

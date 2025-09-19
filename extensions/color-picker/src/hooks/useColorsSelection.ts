import { useState } from "react";
import { HistoryItem, UseColorsSelectionObject } from "../types";

type UseSelectionReturn<T> = {
  selection: UseColorsSelectionObject<T>;
};

export function useColorsSelection<T = string | HistoryItem>(items: T[]): UseSelectionReturn<T> {
  const [selectedItems, setSelectedItems] = useState<T[]>([]);

  const toggleSelection = (item: T) => {
    setSelectedItems((prev) => {
      if (prev.includes(item)) {
        return prev.filter((i) => i !== item);
      } else {
        return [...prev, item];
      }
    });
  };

  const selectAll = () => {
    setSelectedItems([...items]);
  };

  const clearSelection = () => {
    setSelectedItems([]);
  };

  const getIsItemSelected = (item: T) => selectedItems.includes(item);
  const anySelected = selectedItems.length > 0;
  const allSelected = items ? selectedItems.length === items.length : false;
  const countSelected = selectedItems.length;

  return {
    selection: {
      actions: {
        toggleSelection,
        selectAll,
        clearSelection,
      },
      selected: {
        selectedItems,
        anySelected,
        allSelected,
        countSelected,
      },
      helpers: {
        getIsItemSelected,
      },
    },
  };
}

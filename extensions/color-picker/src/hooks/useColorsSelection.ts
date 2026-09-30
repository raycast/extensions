import { useEffect, useState } from "react";
import { HistoryItem, UseColorsSelectionObject } from "../lib/types";

type UseSelectionReturn<T> = {
  selection: UseColorsSelectionObject<T>;
};

export function useColorsSelection<T = string | HistoryItem>(
  items: T[],
  getKey?: (item: T) => string,
): UseSelectionReturn<T> {
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());

  const computeKey = (i: T): string => (getKey ? getKey(i) : (i as unknown as string));

  // Drop selected keys whose items are no longer present, so deletions (single,
  // "Delete All", or background command updates) can't leave ghosts in selection
  // state, and re-picking a previously-deleted color doesn't resurrect it.
  useEffect(() => {
    setSelectedKeys((prev) => {
      if (prev.size === 0) return prev;
      const valid = new Set(items.map((i) => (getKey ? getKey(i) : (i as unknown as string))));
      const next = new Set<string>();
      for (const k of prev) if (valid.has(k)) next.add(k);
      return next.size === prev.size ? prev : next;
    });
  }, [items, getKey]);

  const toggleSelection = (item: T) => {
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      const k = computeKey(item);
      if (next.has(k)) next.delete(k);
      else next.add(k);
      return next;
    });
  };

  const selectAll = () => setSelectedKeys(new Set(items.map(computeKey)));
  const clearSelection = () => setSelectedKeys(new Set());
  const getIsItemSelected = (item: T) => selectedKeys.has(computeKey(item));

  // Derive selectedItems from live `items` so callers never see deleted entries.
  const selectedItems = items.filter((i) => selectedKeys.has(computeKey(i)));

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

import { useLayoutEffect, useState } from "react";

export type ResultGroup<T> = { id: string; title?: string; items: T[] };
export type StableResult<T> = { item: T; unavailable: boolean };

/** Hold browsing positions or apply explicit ranking, retaining a missing selected target. */
export function useStableResults<T extends { id: string }>(
  groups: ResultGroup<T>[],
  context: string,
  resolveItem: (item: T) => T | undefined,
  selectedItemId: string | undefined,
  compareItems?: (a: T, b: T) => number,
) {
  const [held, setHeld] = useState<{ context: string; groups: ResultGroup<T>[] }>();
  const used = new Set<string>();
  const visible: ResultGroup<StableResult<T>>[] = [];
  const isHeld = held?.context === context;
  let hasChangedRows = false;
  if (isHeld) {
    for (const group of held.groups) {
      const items = group.items.flatMap((item) => {
        const current = resolveItem(item);
        if (current === undefined && item.id !== selectedItemId) {
          hasChangedRows = true;
          return [];
        }
        used.add(item.id);
        return [{ item: current ?? item, unavailable: current === undefined }];
      });
      if (items.length) visible.push({ ...group, items });
    }
  }
  for (const group of groups) {
    const added = group.items.filter((item) => !used.has(item.id)).map((item) => ({ item, unavailable: false }));
    if (!added.length) continue;
    hasChangedRows = true;
    const existing = visible.find((candidate) => candidate.id === group.id);
    if (existing) existing.items.push(...added);
    else visible.push({ ...group, items: added });
  }
  if (compareItems) {
    const groupOrder = new Map(groups.map((group, index) => [group.id, index]));
    visible.sort((a, b) => (groupOrder.get(a.id) ?? Infinity) - (groupOrder.get(b.id) ?? Infinity));
    for (const group of visible) group.items.sort((a, b) => compareItems(a.item, b.item));
  }
  const nextGroups = visible.map((group) => ({ ...group, items: group.items.map((row) => row.item) }));
  useLayoutEffect(() => {
    if (isHeld && hasChangedRows) {
      // Commit additions and removals before the next enrichment or selection.
      setHeld({ context, groups: nextGroups });
    }
  }, [isHeld, hasChangedRows, context, nextGroups]);
  return {
    groups: visible,
    hold(next = nextGroups, key = context) {
      setHeld({ context: key, groups: next });
    },
    release() {
      setHeld(undefined);
    },
  };
}

import { useLayoutEffect, useState } from "react";

export type ResultGroup<T> = { id: string; title?: string; items: T[] };
export type StableResult<T> = { item: T; unavailable: boolean };

/** Keep row positions after interaction, while updating data by identity. */
export function useStableResults<T extends { id: string }>(
  groups: ResultGroup<T>[],
  context: string,
  resolveItem: (item: T) => T | undefined,
) {
  const [held, setHeld] = useState<{ context: string; groups: ResultGroup<T>[] }>();
  const used = new Set<string>();
  const visible: ResultGroup<StableResult<T>>[] = [];
  const isHeld = held?.context === context;
  let hasAddedRows = false;
  if (isHeld) {
    for (const group of held.groups) {
      visible.push({
        ...group,
        items: group.items.map((item) => {
          used.add(item.id);
          const current = resolveItem(item);
          return { item: current ?? item, unavailable: current === undefined };
        }),
      });
    }
  }
  for (const group of groups) {
    const added = group.items.filter((item) => !used.has(item.id)).map((item) => ({ item, unavailable: false }));
    if (!added.length) continue;
    hasAddedRows = true;
    const existing = visible.find((candidate) => candidate.id === group.id);
    if (existing) existing.items.push(...added);
    else visible.push({ ...group, items: added });
  }
  const nextGroups = visible.map((group) => ({ ...group, items: group.items.map((row) => row.item) }));
  useLayoutEffect(() => {
    if (isHeld && hasAddedRows) {
      // Commit appended rows before another enrichment can reorder them.
      setHeld({ context, groups: nextGroups });
    }
  }, [isHeld, hasAddedRows, context, nextGroups]);
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

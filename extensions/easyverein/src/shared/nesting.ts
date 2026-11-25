import { RegistryItem } from "./registry";

export interface RowNesting {
  nested?: boolean;
  last?: boolean;
  parentLabel?: string;
}

/** Moves matching children directly below their matching parent, children in registry order. */
export function nestItems(
  rankedItems: RegistryItem[],
  registryItems: RegistryItem[],
): { items: RegistryItem[]; rows: Map<string, RowNesting> } {
  const rankedById = new Map(rankedItems.map((item) => [item.id, item]));
  const registryById = new Map(registryItems.map((item) => [item.id, item]));
  const registryOrder = new Map(registryItems.map((item, index) => [item.id, index]));
  const childrenByParent = new Map<string, RegistryItem[]>();

  for (const item of rankedItems) {
    if (item.parent && rankedById.has(item.parent)) {
      childrenByParent.set(item.parent, [...(childrenByParent.get(item.parent) ?? []), item]);
    }
  }

  const items: RegistryItem[] = [];
  const rows = new Map<string, RowNesting>();
  const placed = new Set<string>();

  for (const item of rankedItems) {
    const head = (item.parent && rankedById.get(item.parent)) || item;

    if (placed.has(head.id)) {
      continue;
    }
    placed.add(head.id);
    items.push(head);

    const parentLabel = head.parent ? registryById.get(head.parent)?.label : undefined;
    if (parentLabel) {
      rows.set(head.id, { parentLabel });
    }

    const children = [...(childrenByParent.get(head.id) ?? [])].sort(
      (first, second) => (registryOrder.get(first.id) ?? 0) - (registryOrder.get(second.id) ?? 0),
    );

    children.forEach((child, index) => {
      items.push(child);
      rows.set(child.id, { nested: true, last: index === children.length - 1 });
    });
  }

  return { items, rows };
}

export function filterDefined<Item>(items: (Item | undefined | null)[]): Item[] {
  const isDefined = (item: Item | undefined | null): item is Item => !!item;
  return items.filter(isDefined);
}

export function keysOf<Item, Key>(items: Item[], keyOf: (item: Item) => Key): Key[] {
  const set = items.reduce((set: Set<Key>, item: Item) => set.add(keyOf(item)), new Set());
  return Array.from(set);
}

export function mapToObject<Item, Value>(
  items: Item[],
  key: (item: Item) => string,
  value: (item: Item) => Value
): { [key in string]: Value } {
  return items.reduce((result, item) => ({ ...result, ...{ [key(item)]: value(item) } }), {});
}

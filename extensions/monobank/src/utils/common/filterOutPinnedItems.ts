export function filterOutPinnedItems<T extends { id: string }>(props: {
  category: string;
  items: T[];
  pinned: string[];
}): T[] {
  const { category, items, pinned } = props;
  return category === "all" ? items.filter((item) => !pinned.includes(item.id)) : items;
}

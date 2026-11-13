/** Raycast can request the next page twice before the first answer lands, which appends the same page again. */
export function uniqueById<Item extends { id: string }>(items: readonly Item[]): Item[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
}

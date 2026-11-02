export function partitionTitleMatches<T extends { type: string; id: string; title: string }>(
  items: T[],
  query: string,
) {
  const titles: T[] = [];
  const content: T[] = [];
  const seen = new Set<string>();
  for (const item of items) {
    const key = `${item.type}:${item.id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    (item.title.toLowerCase().includes(query.trim().toLowerCase()) ? titles : content).push(item);
  }
  return { titles, content };
}

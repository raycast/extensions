import type { RepositorySheet } from "./models";

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

export function repositoryMatchesQuery(sheet: RepositorySheet, query: string, repositoryName = ""): boolean {
  const q = query.trim().toLowerCase();
  return [
    sheet.title,
    sheet.content,
    sheet.filePath,
    sheet.description || "",
    repositoryName,
    ...(sheet.tags || []),
  ].some((value) => value.toLowerCase().includes(q));
}

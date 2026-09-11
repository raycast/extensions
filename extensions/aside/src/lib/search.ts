// Multi-word, order-independent substring filter over title, URL, and optional
// caller text. Each whitespace-separated word must match somewhere.

interface Searchable {
  title?: string;
  url: string;
}

export function filterSearchable<T extends Searchable>(
  items: T[],
  query: string,
  getExtraText?: (item: T) => string | undefined,
): T[] {
  if (!query) return items;
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (words.length === 0) return items;

  return items.filter((item) => {
    const searchableText = `${item.title ?? ""}\n${item.url}\n${getExtraText?.(item) ?? ""}`.toLowerCase();
    return words.every((word) => searchableText.includes(word));
  });
}

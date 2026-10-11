import { EmojiSearchIndex, SearchableEmoji } from "./search";

export const ALL_EMOJIS = "All Emojis";
export const RECENTLY_USED = "Recently Used";

export function emojiSections(
  catalog: SearchableEmoji[],
  recents: SearchableEmoji[],
  index: EmojiSearchIndex<SearchableEmoji>,
  query: string,
  category: string,
  includeCatalog = true,
): { title: string; emojis: SearchableEmoji[] }[] {
  // Typing from the default recents view searches the entire catalog.
  const filterCategory = category === RECENTLY_USED ? "" : category;
  if (query.trim()) {
    return [
      {
        title: filterCategory || ALL_EMOJIS,
        emojis: index.search(query, { category: filterCategory, recentlyUsed: recents }),
      },
    ];
  }
  if (category !== RECENTLY_USED) {
    return [{ title: category || ALL_EMOJIS, emojis: index.search("", { category }) }];
  }
  const recentIds = new Set(recents.map((item) => item.emoji));
  return [
    ...(recents.length ? [{ title: RECENTLY_USED, emojis: recents }] : []),
    ...(includeCatalog ? [{ title: ALL_EMOJIS, emojis: catalog.filter((item) => !recentIds.has(item.emoji)) }] : []),
  ];
}

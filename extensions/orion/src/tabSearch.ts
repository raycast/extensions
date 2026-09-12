import Fuse from "fuse.js";
import { pinyin } from "pinyin-pro";

import { Tab } from "./types";

type SearchableTab = Tab & { titlePinyin: string };

const normalize = (value: string) => value.trim().toLocaleLowerCase();

function toPinyin(value: string): string {
  return pinyin(value, { toneType: "none" }).replace(/\s+/g, "").toLocaleLowerCase();
}

// Exact title/URL matches remain the primary results. Fuzzy and pinyin results
// are intentionally returned only as a fallback, so they never affect Top Hit.
export function searchTabsWithFallback(tabs: Tab[], query: string, limit?: number): Tab[] {
  const normalizedQuery = normalize(query);
  if (!normalizedQuery) return tabs;

  const exact = tabs.filter((tab) => {
    const title = normalize(tab.title);
    const url = normalize(tab.url);
    return title.includes(normalizedQuery) || url.includes(normalizedQuery);
  });
  if (exact.length > 0) return limit ? exact.slice(0, limit) : exact;

  const searchableTabs: SearchableTab[] = tabs.map((tab) => ({ ...tab, titlePinyin: toPinyin(tab.title) }));
  const fuse = new Fuse(searchableTabs, {
    keys: [
      { name: "title", weight: 0.4 },
      { name: "titlePinyin", weight: 0.35 },
      { name: "url", weight: 0.25 },
    ],
    threshold: 0.3,
    includeScore: true,
    shouldSort: true,
    minMatchCharLength: 1,
    ignoreLocation: true,
  });

  return fuse
    .search(normalizedQuery)
    .slice(0, limit)
    .map((result) => result.item);
}

import { useCachedPromise } from "@raycast/utils";
import { MANUAL_BASE, parseManualPages, type ManualPage } from "./fetch-pages";

export type { ManualPage };

export function useManualPages() {
  return useCachedPromise(async () => {
    const res = await fetch(`${MANUAL_BASE}/`);
    if (!res.ok) throw new Error(`Failed to fetch manual (HTTP ${res.status})`);
    return parseManualPages(await res.text());
  });
}

export function groupByCategory(items: ManualPage[]): { category: string; items: ManualPage[] }[] {
  const map = new Map<string, ManualPage[]>();
  for (const item of items) {
    const list = map.get(item.category) ?? [];
    list.push(item);
    map.set(item.category, list);
  }
  return Array.from(map.entries()).map(([category, items]) => ({ category, items }));
}

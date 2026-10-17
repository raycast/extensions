import type { SearchResult, Source } from "../types";

/** 对齐 Chrome 扩展：保留所有标签，再按标题或完整 URL 合并书签与历史。 */
export function deduplicateResults(results: SearchResult[]): SearchResult[] {
  const titles = new Set<string>();
  const urls = new Set<string>();
  const retained = new Set<SearchResult>();
  const sources: Source[] = ["tab", "bookmark", "history"];
  for (const source of sources) {
    for (const result of results) {
      const entry = result.entry;
      if (entry.source !== source) continue;
      if (source !== "tab" && (titles.has(entry.title) || urls.has(entry.url)))
        continue;
      retained.add(result);
      if (entry.title.trim()) titles.add(entry.title);
      if (entry.url) urls.add(entry.url);
    }
  }
  // 来源优先级只决定保留哪条记录，不改变其他结果的相关度排序。
  return results.filter((result) => retained.has(result));
}

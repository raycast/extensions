import {
  createSearcher,
  isStrictnessSatisfied,
  type Searcher,
} from "text-search-engine";
import type { BrowserEntry, Scope, SearchResult, Source } from "../types";
import { FullUrlSearchIndex } from "./full-url-engine";
import { normalizeRanges } from "./highlight";
import { letterMask } from "./letter-mask";
import { normalizeSearchParameters, type SearchParameters } from "./config";

export type SearchStrategy = "chrome" | "full-url";
interface IndexedEntry {
  entry: BrowserEntry;
  originalTitle: string;
  originalUrl: string;
  title: string;
  host: string;
  titleOffset: number;
  hostOffset: number;
  letterMask: number;
}
interface IndexedResult {
  row: IndexedEntry;
  result: SearchResult;
}
const MAX_CACHED_TEXT_LENGTH = 5000;

/** 默认复用 Chrome 的标题与 host 语义，显式增强模式保留原完整网址策略。 */
export class SearchIndex {
  private rows: IndexedEntry[] = [];
  private searchers = new Map<
    IndexedEntry,
    Searcher<IndexedEntry, "title" | "host">
  >();
  private cachedTextLength = 0;
  private enhanced?: FullUrlSearchIndex;
  private options: SearchParameters;

  constructor(
    entries: BrowserEntry[],
    strategy: SearchStrategy = "chrome",
    options?: Partial<SearchParameters>,
  ) {
    this.options = normalizeSearchParameters(options);
    if (strategy === "full-url") {
      this.enhanced = new FullUrlSearchIndex(entries, options);
      return;
    }
    this.rows = entries.flatMap((entry) => {
      const originalTitle = entry.title;
      const originalUrl = entry.url;
      if (
        entry.source === "tab" &&
        (!originalTitle || !originalUrl || originalUrl.startsWith("chrome://"))
      )
        return [];
      let host: string;
      try {
        host = new URL(originalUrl).host;
      } catch {
        return [];
      }
      const authorityStart = originalUrl.indexOf("//") + 2;
      const authority = originalUrl.slice(authorityStart).split(/[/?#]/, 1)[0];
      let hostOffset = authorityStart + authority.lastIndexOf("@") + 1;
      if (
        originalUrl
          .slice(hostOffset, hostOffset + host.length)
          .toLowerCase() !== host.toLowerCase()
      )
        hostOffset = -1;
      const title = originalTitle.trim();
      return {
        entry,
        originalTitle,
        originalUrl,
        title,
        host,
        titleOffset: originalTitle.length - originalTitle.trimStart().length,
        hostOffset,
        letterMask: letterMask(`${title}${host}`.toLocaleLowerCase()),
      };
    });
  }

  replaceSource(source: Source, entries: BrowserEntry[]) {
    if (this.enhanced) {
      this.enhanced.replaceSource(source, entries);
      return;
    }
    const retained = this.rows.filter((row) => {
      if (row.entry.source !== source) return true;
      if (this.searchers.delete(row))
        this.cachedTextLength -= row.title.length + row.host.length;
      return false;
    });
    this.rows = retained.concat(
      new SearchIndex(entries, "chrome", this.options).rows,
    );
    // Chrome 后台固定发送 tab → history → bookmark，不依赖异步读取完成顺序。
    const priority = { tab: 0, history: 1, bookmark: 2 };
    this.rows.sort(
      (a, b) => priority[a.entry.source] - priority[b.entry.source],
    );
  }

  private match(row: IndexedEntry, query: string) {
    let searcher = this.searchers.get(row);
    if (!searcher) {
      searcher = createSearcher([row], {
        getFields: ({ title, host }) => ({ title, host }),
        mergeSpaces: true,
        isCharConsecutive: this.options.enableConsecutiveSearch,
      });
      const length = row.title.length + row.host.length;
      if (this.cachedTextLength + length <= MAX_CACHED_TEXT_LENGTH) {
        this.searchers.set(row, searcher);
        this.cachedTextLength += length;
      }
    }
    return searcher.search(query)[0];
  }

  async search(
    query: string,
    scope: Scope,
    cancelled: () => boolean = () => false,
  ): Promise<SearchResult[]> {
    if (this.enhanced) return this.enhanced.search(query, scope, cancelled);
    const trimmedQuery = query.trim();
    const normalized = trimmedQuery.toLocaleLowerCase();
    let requiredLetters = 0;
    for (const char of normalized) {
      const code = char.charCodeAt(0);
      if (code >= 97 && code <= 122) requiredLetters |= 1 << (code - 97);
    }
    const results: IndexedResult[] = [];
    for (let i = 0; i < this.rows.length; i++) {
      if (i % 250 === 0) {
        await new Promise<void>((resolve) => setImmediate(resolve));
        if (cancelled()) return [];
      }
      const row = this.rows[i];
      if (scope !== "all" && row.entry.source !== scope) continue;
      if ((row.letterMask & requiredLetters) !== requiredLetters) continue;
      if (!normalized) {
        results.push({
          row,
          result: {
            entry: row.entry,
            titleRanges: [],
            urlRanges: [],
            score: 0,
          },
        });
        continue;
      }
      const hit = this.match(row, normalized);
      // 与 Chrome createListSearcher 一样，合并空格后再检查严格度。
      if (!hit || !isStrictnessSatisfied(0.6, trimmedQuery, hit.hitRanges))
        continue;
      const titleRanges = normalizeRanges(
        hit.fieldHitRanges.title,
        row.title.length,
      ).map(([start, end]): [number, number] => [
        start + row.titleOffset,
        end + row.titleOffset,
      ]);
      const urlRanges =
        row.hostOffset < 0
          ? []
          : normalizeRanges(hit.fieldHitRanges.host, row.host.length).map(
              ([start, end]): [number, number] => [
                start + row.hostOffset,
                end + row.hostOffset,
              ],
            );
      results.push({
        row,
        result: {
          entry: row.entry,
          titleRanges,
          urlRanges,
          score: -hit.hitRanges.length,
        },
      });
    }
    return orderChromeResults(results, this.options);
  }
}

/** 命中段数负责相关度；来源内时间排序和最终全局排序均保持稳定。 */
function orderChromeResults(
  matches: IndexedResult[],
  options: SearchParameters,
): SearchResult[] {
  const tabs = matches.filter(({ row }) => row.entry.source === "tab");
  const seen = new Set<string>();
  for (const { row } of tabs) {
    seen.add(row.originalTitle);
    seen.add(row.originalUrl);
  }
  const histories: IndexedResult[] = [];
  const bookmarks: IndexedResult[] = [];
  for (const match of matches) {
    const { row } = match;
    if (row.entry.source === "tab") continue;
    if (seen.has(row.originalTitle) || seen.has(row.originalUrl)) continue;
    seen.add(row.originalTitle);
    seen.add(row.originalUrl);
    (row.entry.source === "history" ? histories : bookmarks).push(match);
  }
  const segments = (a: IndexedResult, b: IndexedResult) =>
    b.result.score - a.result.score;
  return [
    ...tabs
      .sort((a, b) => {
        const first = a.row.entry.lastAccessed;
        const second = b.row.entry.lastAccessed;
        // JXA 没有最近访问时间，不能伪造；缺失时保留采集顺序。
        return first === undefined || second === undefined ? 0 : second - first;
      })
      .sort(segments)
      .sort(
        (a, b) => Number(!!b.row.entry.active) - Number(!!a.row.entry.active),
      ),
    ...histories
      .sort(
        (a, b) => (b.row.entry.visitedAt ?? 0) - (a.row.entry.visitedAt ?? 0),
      )
      .sort(segments)
      .slice(0, options.historyDisplayCount),
    ...bookmarks.sort(segments).slice(0, options.bookmarkDisplayCount),
  ]
    .sort(segments)
    .map(({ result }) => result);
}

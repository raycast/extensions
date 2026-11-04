import { createSearcher, type Searcher } from "text-search-engine";
import type { BrowserEntry, Scope, SearchResult, Source } from "../types";
import { normalizeRanges } from "./highlight";
import { letterMask } from "./letter-mask";
import { deduplicateResults } from "./deduplicate";
import { normalizeSearchParameters, type SearchParameters } from "./config";

interface IndexedEntry {
  entry: BrowserEntry;
  title: string;
  url: string;
  letterMask: number;
}

type FieldScope = "title" | "all";
type EntrySearcher = Searcher<IndexedEntry, "title" | "separator" | "url">;
const MAX_CACHED_TEXT_LENGTH = 5000;

export class FullUrlSearchIndex {
  private rows: IndexedEntry[];
  private searchers = new Map<
    IndexedEntry,
    Partial<Record<FieldScope, EntrySearcher>>
  >();
  private cachedTextLength = 0;
  private options: SearchParameters;
  constructor(
    entries: BrowserEntry[],
    private configured?: Partial<SearchParameters>,
  ) {
    this.options = normalizeSearchParameters(configured);
    this.rows = entries.map((entry) => {
      const title = entry.title || entry.url;
      return {
        entry: entry.title ? entry : { ...entry, title },
        title,
        url: entry.url,
        letterMask: letterMask(`${title}\n${entry.url}`.toLocaleLowerCase()),
      };
    });
  }

  replaceSource(source: Source, entries: BrowserEntry[]) {
    const retained = this.rows.filter((row) => {
      if (row.entry.source !== source) return true;
      const cached = this.searchers.get(row);
      if (cached?.title) this.cachedTextLength -= row.title.length;
      if (cached?.all)
        this.cachedTextLength -= row.title.length + 1 + row.url.length;
      this.searchers.delete(row);
      return false;
    });
    // 其他来源保留已规范化文本和拼音映射，不因一批标签返回而重建历史。
    this.rows = retained.concat(
      new FullUrlSearchIndex(entries, this.configured).rows,
    );
  }

  private match(
    row: IndexedEntry,
    scope: FieldScope,
    query: string,
    fallbackQuery: string,
  ) {
    const cached = this.searchers.get(row);
    let searcher = cached?.[scope];
    if (!searcher) {
      searcher = createSearcher([row], {
        getFields: ({ title, url }) => ({
          title,
          separator: scope === "all" ? "\n" : "",
          url: scope === "all" ? url : "",
        }),
        mergeSpaces: false,
        isCharConsecutive: this.options.enableConsecutiveSearch,
      });
      // SDK 在实例内保留拼音映射；限制缓存文本总长，避免长 URL 无界累积。
      const length =
        row.title.length + (scope === "all" ? 1 + row.url.length : 0);
      if (this.cachedTextLength + length <= MAX_CACHED_TEXT_LENGTH) {
        this.searchers.set(row, { ...cached, [scope]: searcher });
        this.cachedTextLength += length;
      }
    }
    // 原顺序失败时只重试一次，防止短词先占用长词；仍由原引擎保证位置不重复。
    return (
      searcher.search(query)[0] ??
      (fallbackQuery !== query ? searcher.search(fallbackQuery)[0] : undefined)
    );
  }

  async search(
    query: string,
    scope: Scope,
    cancelled: () => boolean = () => false,
  ): Promise<SearchResult[]> {
    const normalized = query.trim().toLocaleLowerCase();
    const fallbackQuery = normalized
      .split(/\s+/)
      .sort((a, b) => b.length - a.length)
      .join(" ");
    // 只用于排除必定不匹配的记录，实际匹配与命中范围仍由引擎计算。
    let requiredLetters = 0;
    for (const char of normalized) {
      const code = char.charCodeAt(0);
      if (code >= 97 && code <= 122) requiredLetters |= 1 << (code - 97);
    }
    const results: SearchResult[] = [];
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
          entry: row.entry,
          titleRanges: [],
          urlRanges: [],
          score: row.entry.active ? 1 : 0,
        });
        continue;
      }
      // 完整标题命中优先，网址的字面命中不能遮掉标题的拼音相关度。
      const lowerTitle = row.title.toLocaleLowerCase();
      const hit =
        this.match(row, "title", normalized, fallbackQuery) ??
        this.match(row, "all", normalized, fallbackQuery);
      if (!hit) continue;
      const ranges = normalizeRanges(
        hit.hitRanges,
        row.title.length + 1 + row.url.length,
      );
      const titleRanges = normalizeRanges(
        hit.fieldHitRanges.title,
        row.title.length,
      );
      const urlRanges = normalizeRanges(hit.fieldHitRanges.url, row.url.length);
      const matched = ranges.reduce((sum, [a, b]) => sum + b - a + 1, 0);
      const span = ranges.at(-1)![1] - ranges[0][0] + 1;
      const titleOnly = titleRanges.length > 0 && urlRanges.length === 0;
      const score =
        (lowerTitle === normalized
          ? 1000
          : lowerTitle.startsWith(normalized)
            ? 500
            : 0) +
        (titleOnly ? 200 : titleRanges.length ? 100 : 0) +
        (50 * matched) / span -
        ranges.length;
      results.push({ entry: row.entry, titleRanges, urlRanges, score });
    }
    const priority = { tab: 0, bookmark: 1, history: 2 };
    const ordered = results.sort(
      (a, b) =>
        b.score - a.score ||
        priority[a.entry.source] - priority[b.entry.source] ||
        (b.entry.visitedAt ?? 0) - (a.entry.visitedAt ?? 0),
    );
    if (
      this.configured?.historyDisplayCount === undefined &&
      this.configured?.bookmarkDisplayCount === undefined
    )
      return ordered;
    // 数量表示去重后的展示上限，重复标签不能占掉历史与书签名额。
    const candidates = scope === "all" ? deduplicateResults(ordered) : ordered;
    const counts = { history: 0, bookmark: 0 };
    return candidates.filter(({ entry }) => {
      const source = entry.source;
      if (source === "tab") return true;
      const key =
        source === "history" ? "historyDisplayCount" : "bookmarkDisplayCount";
      const limit =
        this.configured?.[key] === undefined ? Infinity : this.options[key];
      return ++counts[source] <= limit;
    });
  }
}

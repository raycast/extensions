import {
  extractBoundaryMapping,
  searchSentenceByBoundaryMapping,
} from "text-search-engine";
import type {
  BrowserEntry,
  Range,
  Scope,
  SearchResult,
  Source,
} from "../types";
import { normalizeRanges } from "./highlight";

type Mapping = ReturnType<typeof extractBoundaryMapping>;
interface IndexedEntry {
  entry: BrowserEntry;
  title: string;
  url: string;
  sourceLength: number;
  lower: string;
  offsets?: Range[];
  letterMask: number;
}

const characterMasks = new Map<string, number>();
function letterMask(source: string): number {
  let mask = 0;
  for (const char of source) {
    const code = char.charCodeAt(0);
    if (code >= 97 && code <= 122) mask |= 1 << (code - 97);
    else if (code > 127) {
      let cached = characterMasks.get(char);
      if (cached === undefined) {
        cached = 0;
        // 仅复用引擎的拼音展开，不引入第二套字典或匹配规则。
        for (const letter of extractBoundaryMapping(char).pinyinString) {
          const code = letter.charCodeAt(0);
          if (code >= 97 && code <= 122) cached |= 1 << (code - 97);
        }
        characterMasks.set(char, cached);
      }
      mask |= cached;
    }
  }
  return mask;
}

/** 小写可能改变 UTF-16 长度，因此显式保留到显示字符串的映射。 */
export function lowerWithOffsets(source: string) {
  let lower = "";
  let position = 0;
  const offsets: Range[] = [];
  for (const char of source) {
    const transformed = char.toLocaleLowerCase();
    lower += transformed;
    for (let i = 0; i < transformed.length; i++)
      offsets.push([position, position + char.length - 1]);
    position += char.length;
  }
  return { lower, offsets };
}

export class SearchIndex {
  private rows: IndexedEntry[];
  private mappings = new Map<string, Mapping>();
  private mappingUnits = 0;
  constructor(entries: BrowserEntry[]) {
    this.rows = entries.map((entry) => {
      const title = entry.title || entry.url;
      const source = `${title}\n${entry.url}`;
      const lower = source.toLocaleLowerCase();
      const expanded =
        lower.length !== source.length ? lowerWithOffsets(source) : undefined;
      return {
        entry: entry.title ? entry : { ...entry, title },
        title,
        url: entry.url,
        sourceLength: source.length,
        lower: expanded?.lower ?? lower,
        offsets: expanded?.offsets,
        letterMask: letterMask(lower),
      };
    });
  }

  replaceSource(source: Source, entries: BrowserEntry[]) {
    const retained = this.rows.filter((row) => {
      if (row.entry.source !== source) return true;
      for (const prefix of ["title:", "all:"]) {
        const key = prefix + row.entry.id;
        const mapping = this.mappings.get(key);
        if (mapping) {
          this.mappingUnits -=
            mapping.boundary.length + mapping.originalIndices.length;
          this.mappings.delete(key);
        }
      }
      return false;
    });
    // 其他来源保留已规范化文本和拼音映射，不因一批标签返回而重建历史。
    this.rows = retained.concat(new SearchIndex(entries).rows);
  }

  private match(
    key: string,
    source: string,
    query: string,
    fallbackQuery: string,
  ) {
    const direct = source.indexOf(query);
    if (direct >= 0) return [[direct, direct + query.length - 1]] as Range[];
    let mapping = this.mappings.get(key);
    if (!mapping) {
      mapping = extractBoundaryMapping(source);
      // 标题与组合字段共用展开规模预算，避免长 URL 的边界对象累积。
      const units = mapping.boundary.length + mapping.originalIndices.length;
      if (this.mappingUnits + units <= 20000) {
        this.mappings.set(key, mapping);
        this.mappingUnits += units;
      }
    }
    const ranges = searchSentenceByBoundaryMapping(mapping, query).hitRanges;
    // 原顺序失败时只重试一次，防止短词先占用长词；仍由原引擎保证位置不重复。
    return (
      ranges ??
      (fallbackQuery !== query
        ? searchSentenceByBoundaryMapping(mapping, fallbackQuery).hitRanges
        : undefined)
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
      const hitRanges =
        this.match(
          `title:${row.entry.id}`,
          lowerTitle,
          normalized,
          fallbackQuery,
        ) ??
        this.match(`all:${row.entry.id}`, row.lower, normalized, fallbackQuery);
      if (!hitRanges) continue;
      const ranges = normalizeRanges(
        hitRanges.map(([a, b]): Range => [
          row.offsets?.[a]?.[0] ?? a,
          row.offsets?.[b]?.[1] ?? b,
        ]),
        row.sourceLength,
      );
      const titleRanges = normalizeRanges(
        ranges.map(([a, b]): Range => [a, Math.min(b, row.title.length - 1)]),
        row.title.length,
      );
      const urlStart = row.title.length + 1;
      const urlRanges = normalizeRanges(
        ranges
          .filter(([, b]) => b >= urlStart)
          .map(([a, b]): Range => [Math.max(0, a - urlStart), b - urlStart]),
        row.url.length,
      );
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
    return results.sort(
      (a, b) =>
        b.score - a.score ||
        priority[a.entry.source] - priority[b.entry.source] ||
        (b.entry.visitedAt ?? 0) - (a.entry.visitedAt ?? 0),
    );
  }
}

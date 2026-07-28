import type { QueryEntry } from "../models/types";

/**
 * Query string 与键值列表互转的纯函数，供 Query 编辑器与 URL 双向同步。
 */

/** 把 query string 解析为键值列表。空串返回空数组。 */
export function parseQueryString(qs: string): QueryEntry[] {
  const trimmed = qs.trim();
  if (!trimmed) return [];
  const params = new URLSearchParams(trimmed);
  const entries: QueryEntry[] = [];
  for (const [key, value] of params) {
    entries.push({ key, value, enabled: true });
  }
  return entries;
}

/** 把键值列表构建为 query string（不含前导 `?`）。禁用的条目被跳过。 */
export function buildQueryString(entries: readonly QueryEntry[]): string {
  const params = new URLSearchParams();
  for (const entry of entries) {
    if (entry.enabled && entry.key) {
      params.append(entry.key, entry.value);
    }
  }
  return params.toString();
}

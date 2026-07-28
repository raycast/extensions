import { LocalStorage } from "@raycast/api";

import type { RequestModel } from "../models/request";
import type { HistoryModel, ResponseSummary } from "../models/response";
import { generateId } from "../utils/url";

/**
 * 历史记录存储（FIFO，最多 20 条）。
 *
 * `LocalStorage` 只支持 `string | number | boolean`，因此数组以 JSON 字符串
 * 形式存取；读取时做容错解析，损坏数据回退为空数组。
 * UI 层不直接调用 `LocalStorage`，统一通过本模块读写。
 * 历史只存 `RequestModel` + `ResponseSummary`（不含完整响应体），控制体积。
 */

const HISTORY_KEY = "http-history";
const MAX_HISTORY = 20;

/** 加载全部历史记录；key 不存在或损坏时返回空数组。 */
export async function loadHistory(): Promise<HistoryModel[]> {
  const raw = await LocalStorage.getItem<string>(HISTORY_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as HistoryModel[]) : [];
  } catch {
    return [];
  }
}

/** 追加一条历史记录，自动截断到最近 {@link MAX_HISTORY} 条。返回更新后的列表。 */
export async function addHistory(request: RequestModel, summary: ResponseSummary): Promise<HistoryModel[]> {
  const list = await loadHistory();
  const entry: HistoryModel = {
    id: generateId(),
    request,
    responseSummary: summary,
    createdAt: Date.now(),
  };
  const next = [entry, ...list].slice(0, MAX_HISTORY);
  await LocalStorage.setItem(HISTORY_KEY, JSON.stringify(next));
  return next;
}

/** 删除指定 id 的历史记录，返回更新后的列表。 */
export async function deleteHistory(id: string): Promise<HistoryModel[]> {
  const list = await loadHistory();
  const next = list.filter((h) => h.id !== id);
  await LocalStorage.setItem(HISTORY_KEY, JSON.stringify(next));
  return next;
}

/** 清空全部历史记录。 */
export async function clearHistory(): Promise<void> {
  await LocalStorage.removeItem(HISTORY_KEY);
}

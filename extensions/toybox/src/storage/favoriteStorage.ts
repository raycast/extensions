import { LocalStorage } from "@raycast/api";

import type { RequestModel } from "../models/request";
import type { FavoriteModel } from "../models/response";
import { generateId } from "../utils/url";

/**
 * 收藏存储（不限数量）。
 *
 * `LocalStorage` 只支持 `string | number | boolean`，因此数组以 JSON 字符串
 * 形式存取；读取时做容错解析，损坏数据回退为空数组。
 * UI 层不直接调用 `LocalStorage`，统一通过本模块读写。
 */

const FAVORITES_KEY = "http-favorites";

/** 加载全部收藏；key 不存在或损坏时返回空数组。 */
export async function loadFavorites(): Promise<FavoriteModel[]> {
  const raw = await LocalStorage.getItem<string>(FAVORITES_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as FavoriteModel[]) : [];
  } catch {
    return [];
  }
}

/** 新增一条收藏，返回更新后的列表。 */
export async function addFavorite(request: RequestModel, title: string): Promise<FavoriteModel[]> {
  const list = await loadFavorites();
  const entry: FavoriteModel = {
    id: generateId(),
    request,
    title,
    createdAt: Date.now(),
  };
  const next = [entry, ...list];
  await LocalStorage.setItem(FAVORITES_KEY, JSON.stringify(next));
  return next;
}

/** 删除指定 id 的收藏，返回更新后的列表。 */
export async function deleteFavorite(id: string): Promise<FavoriteModel[]> {
  const list = await loadFavorites();
  const next = list.filter((f) => f.id !== id);
  await LocalStorage.setItem(FAVORITES_KEY, JSON.stringify(next));
  return next;
}

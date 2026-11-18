import { Cache } from "@raycast/api";

// 视图偏好（视图模式、排序、分组）存同步的 Cache：首帧就按记忆渲染，不会先画默认值再跳。
// Cache 超出容量时可能被 Raycast 清掉，此时回落默认值，不会出错。
export const viewPrefs = new Cache();

/** 读一个记住的选项；没存过、或值已不合法（如选项被移除）时返回 fallback。 */
export function readCachedChoice<T extends string>(
  key: string,
  isValid: (value: string) => value is T,
  fallback: T,
): T {
  const stored = viewPrefs.get(key);
  return stored !== undefined && isValid(stored) ? stored : fallback;
}

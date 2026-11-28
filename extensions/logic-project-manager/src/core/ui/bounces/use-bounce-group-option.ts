import { isBounceGroup, type BounceGroup } from "@/core/ui/shared/grouping";
import { useCachedChoice } from "@/core/ui/hooks/use-cached-choice";

// 读取/持久化 bounce 列表的分组选择（含按来源分组）。
// legacy：旧版本把同一个设置存在 LocalStorage 里，键名和格式各不相同，第一次读到时搬进 Cache。
export function useBounceGroupOption(
  storageKey: string,
  fallback: BounceGroup,
  legacy?: { key: string; parse?: (raw: string) => string },
) {
  return useCachedChoice(storageKey, isBounceGroup, fallback, legacy);
}

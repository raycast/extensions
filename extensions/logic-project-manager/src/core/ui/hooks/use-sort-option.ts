import { isSortOption, type SortOption } from "@/core/ui/shared/sorting";
import { useCachedChoice } from "@/core/ui/hooks/use-cached-choice";

// 读取/持久化某个界面的排序选择（同步读，首帧即为记住的值）。
// allowed = 这个界面开放哪些选项；若存储里的值不在 allowed 内（或非法），回落到 fallback。
export function useSortOption(storageKey: string, allowed: SortOption[], fallback: SortOption) {
  return useCachedChoice(
    storageKey,
    (value): value is SortOption => isSortOption(value) && allowed.includes(value),
    fallback,
  );
}

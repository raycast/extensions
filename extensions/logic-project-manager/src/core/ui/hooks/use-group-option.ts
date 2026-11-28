import { isGroupOption, type GroupOption } from "@/core/ui/shared/grouping";
import { useCachedChoice } from "@/core/ui/hooks/use-cached-choice";

// 读取/持久化某界面的分组选择（同步读，首帧即为记住的值）。
export function useGroupOption(storageKey: string, fallback: GroupOption) {
  return useCachedChoice(storageKey, isGroupOption, fallback);
}

import type { Group } from "./grouping";

// 首帧只渲染前这么多项，其余在首帧之后补上：列表很长时先出画面，不卡在渲染上。
export const INITIAL_ITEM_COUNT = 15;
// 补全的延迟。0 表示下一个宏任务就补，只让首帧少渲染。
export const FILL_DELAY_MS = 0;

// 还没补全时的渲染上限；补全后不设上限。
export function itemLimit(showAll: boolean): number {
  return showAll ? Number.POSITIVE_INFINITY : INITIAL_ITEM_COUNT;
}

// 按剩余名额截断分组：分组和排序已完成，只截掉最后渲染的部分，空掉的分组不渲染。
export function limitGroups<T>(groups: Group<T>[], limit: number): Group<T>[] {
  let budget = limit;
  return groups
    .map((group) => {
      const items = group.items.slice(0, Math.max(0, budget));
      budget -= items.length;
      return { ...group, items };
    })
    .filter((group) => group.items.length > 0);
}

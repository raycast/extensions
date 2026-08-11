import type { ItemActivityMap } from "../activity/item-activity";
import type { ItemReference } from "./item";
export function rankItems<T extends ItemReference>(items: T[], activity: ItemActivityMap): T[] {
  return items.toSorted((a, b) => {
    const left = activity[`${a.shareId}:${a.itemId}`];
    const right = activity[`${b.shareId}:${b.itemId}`];
    return Number(right?.pinned) - Number(left?.pinned) || (right?.lastUsedAt ?? 0) - (left?.lastUsedAt ?? 0);
  });
}

import { open, showToast, Toast } from "@raycast/api";
import { getOpenTarget } from "../../lib/openAlias";
import { incrementUsage } from "../../lib/usageStatsManager";
import type { BetterAliasItem } from "../../schemas";

/**
 * Opens filtered items sequentially using the same resolution rules as the single-item "Open" action.
 *
 * Behavior:
 *     * If `count` is `undefined`, `0`, or represents "Enter" (open-all intent), it opens all filtered items.
 *     * If `count` is greater than or equal to the number of filtered items, it opens all filtered items.
 *     * Otherwise, it opens only the first `count` filtered items.
 *
 * Notes:
 *     * Items are opened one-by-one (awaited) to reduce OS-level race conditions.
 *     * Uses `getOpenTarget` so URLs, paths, and `open ...` commands resolve consistently.
 */
export async function handleOpenItems(
  allFilteredItems: [string, BetterAliasItem][] | undefined,
  count?: number,
): Promise<void> {
  if (!allFilteredItems) return;

  const itemsToOpen =
    !count || count === 0 || count >= allFilteredItems.length ? allFilteredItems : allFilteredItems.slice(0, count);

  const itemCount = itemsToOpen.length;
  const toast = await showToast({
    style: Toast.Style.Animated,
    title: `Opening ${itemCount} ${itemCount === 1 ? "item" : "items"}...`,
  });

  try {
    for (const [aliasKey, aliasItem] of [...itemsToOpen].reverse()) {
      incrementUsage(aliasKey);
      const target = getOpenTarget(aliasItem.value);
      if (target) {
        await open(target);
      }
    }

    toast.style = Toast.Style.Success;
    toast.title = `Opened ${itemCount} ${itemCount === 1 ? "item" : "items"}`;
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = "Failed to open items";
    toast.message = error instanceof Error ? error.message : String(error);
  }
}

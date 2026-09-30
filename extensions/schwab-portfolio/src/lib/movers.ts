import type { MoverItem } from "../types/quotes";

export function normalizeMoverItems(
  items: MoverItem[],
): Array<MoverItem & { symbol: string; netPercentChange: number }> {
  return items.filter(
    (item): item is MoverItem & { symbol: string; netPercentChange: number } =>
      Boolean(item.symbol) && item.netPercentChange != null,
  );
}

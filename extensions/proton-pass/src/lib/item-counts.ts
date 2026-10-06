/** Number of items in each of these vaults, empty vaults included. Items of other vaults are ignored. */
export function countItemsByVault(vaults: { shareId: string }[], items: { shareId: string }[]): Map<string, number> {
  const counts = new Map(vaults.map((vault) => [vault.shareId, 0]));
  for (const item of items) {
    const count = counts.get(item.shareId);
    if (count !== undefined) counts.set(item.shareId, count + 1);
  }
  return counts;
}

/** Counts after a listing: vaults whose items couldn't be listed keep their earlier count, if any. */
export function refreshItemCounts(
  previous: Map<string, number>,
  vaults: { shareId: string }[],
  items: { shareId: string }[],
  failedShareIds: Set<string>,
): Map<string, number> {
  const counted = countItemsByVault(
    vaults.filter((vault) => !failedShareIds.has(vault.shareId)),
    items,
  );
  return new Map([...[...previous].filter(([shareId]) => failedShareIds.has(shareId)), ...counted]);
}

/** Total of these vaults, only when each of them has a count. */
export function totalItemCount(vaults: { shareId: string }[], counts: Map<string, number>): number | undefined {
  let total = 0;
  for (const vault of vaults) {
    const count = counts.get(vault.shareId);
    if (count === undefined) return undefined;
    total += count;
  }
  return vaults.length > 0 ? total : undefined;
}

/** "1 item", "12 items". */
export function formatItemCount(count: number): string {
  return `${count.toLocaleString()} ${count === 1 ? "item" : "items"}`;
}

/** "Personal · 12", or just the title while the count is unknown. */
export function titleWithCount(title: string, count: number | undefined): string {
  return count === undefined ? title : `${title} · ${count.toLocaleString()}`;
}

/** Number of items in each of these vaults, empty vaults included. Items of other vaults are ignored. */
export function countItemsByVault(vaults: { shareId: string }[], items: { shareId: string }[]): Map<string, number> {
  const counts = new Map(vaults.map((vault) => [vault.shareId, 0]));
  for (const item of items) {
    const count = counts.get(item.shareId);
    if (count !== undefined) counts.set(item.shareId, count + 1);
  }
  return counts;
}

/** "1 item", "12 items". */
export function formatItemCount(count: number): string {
  return `${count.toLocaleString()} ${count === 1 ? "item" : "items"}`;
}

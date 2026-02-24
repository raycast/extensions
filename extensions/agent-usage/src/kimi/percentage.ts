export function getRemainingPercent(remaining: number, limit: number): number {
  if (!Number.isFinite(remaining) || !Number.isFinite(limit) || limit <= 0) {
    return 0;
  }
  return Math.round((remaining / limit) * 100);
}

export function formatRemainingPercent(remaining: number, limit: number): string {
  if (!Number.isFinite(remaining) || !Number.isFinite(limit) || limit <= 0) {
    return "--";
  }
  return `${getRemainingPercent(remaining, limit)}%`;
}

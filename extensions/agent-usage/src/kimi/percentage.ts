export function formatRemainingPercent(remaining: number, limit: number): string {
  if (!Number.isFinite(remaining) || !Number.isFinite(limit) || limit <= 0) {
    return "--";
  }

  return `${Math.round((remaining / limit) * 100)}%`;
}

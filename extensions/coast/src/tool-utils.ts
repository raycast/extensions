export function boundedNumber(
  value: number | undefined,
  fallback: number,
  maximum: number,
): number {
  if (value === undefined || !Number.isFinite(value)) return fallback;
  return Math.max(1, Math.min(Math.floor(value), maximum));
}

export function truncate(
  value: string | null | undefined,
  limit: number,
): string {
  if (!value) return "";
  return value.length > limit ? `${value.slice(0, limit)}\n[truncated]` : value;
}

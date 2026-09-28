export function record(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}
export function percent(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 100
    ? value
    : undefined;
}
export function text(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}
export function isoDate(value: unknown, unixSeconds = false): string | undefined {
  if (
    unixSeconds
      ? typeof value !== "number" || !Number.isFinite(value)
      : typeof value !== "string" || !value.trim()
  )
    return undefined;
  const date = new Date(unixSeconds ? (value as number) * 1000 : (value as string));
  return Number.isFinite(date.getTime()) ? date.toISOString() : undefined;
}

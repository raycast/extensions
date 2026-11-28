export function clampLimit(value: number | undefined, defaultValue: number, maximum: number): number {
  if (value === undefined) return defaultValue;
  if (!Number.isFinite(value)) throw new Error("Limit must be a finite number.");
  return Math.min(maximum, Math.max(1, Math.floor(value)));
}

export function requireNonEmpty(value: string, fieldName: string): string {
  const trimmed = value.trim();
  if (!trimmed) throw new Error(`${fieldName} must not be empty.`);
  return trimmed;
}

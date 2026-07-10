/** Safe narrowing helpers for parsed-but-untyped JSON. */

export function asRecord(v: unknown): Record<string, unknown> | undefined {
  return typeof v === "object" && v !== null ? (v as Record<string, unknown>) : undefined;
}

export function asNumber(v: unknown): number | undefined {
  return typeof v === "number" && Number.isFinite(v) ? v : undefined;
}

export function asString(v: unknown): string | undefined {
  return typeof v === "string" ? v : undefined;
}

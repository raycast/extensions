export type JsonRecord = Record<string, unknown>;

export function requireRecord(value: unknown, label: string): JsonRecord {
  if (!isRecord(value)) throw new Error(`Invalid ${label} response`);
  return value;
}

export function optionalRecordArray(value: unknown): JsonRecord[] {
  if (!Array.isArray(value)) return [];
  return value.filter(isRecord);
}

export function optionalRecord(value: unknown): JsonRecord | undefined {
  return isRecord(value) ? value : undefined;
}

export function optionalString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

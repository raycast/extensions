export type UnknownRecord = Record<string, unknown>;

export function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null;
}

export function optionalString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export function optionalRawString(value: unknown) {
  return typeof value === "string" ? value : "";
}

export function optionalBoolean(value: unknown) {
  return typeof value === "boolean" ? value : undefined;
}

export function optionalNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value)
    ? value
    : undefined;
}

export function uniqueStrings(values: string[]) {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

export function normalizeStringArray(value: unknown) {
  if (!Array.isArray(value)) return [];
  return uniqueStrings(
    value.filter((item): item is string => typeof item === "string"),
  );
}

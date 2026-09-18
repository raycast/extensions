export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}

export type JsonRecord = Record<string, unknown>;

export function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function expectRecord(value: unknown, context: string): JsonRecord {
  if (!isRecord(value)) {
    throw new ValidationError(`${context} must be an object`);
  }
  return value;
}

export function expectString(record: JsonRecord, key: string, context: string): string {
  const value = record[key];
  if (typeof value !== "string" || value.trim() === "") {
    throw new ValidationError(`${context}.${key} must be a non-empty string`);
  }
  return value;
}

export function expectNullableString(record: JsonRecord, key: string, context: string): string | null {
  const value = record[key];
  if (value === null || value === undefined) {
    return null;
  }
  if (typeof value !== "string") {
    throw new ValidationError(`${context}.${key} must be a string or null`);
  }
  return value.trim() === "" ? null : value;
}

export function expectStringArray(record: JsonRecord, key: string, context: string): string[] {
  const value = record[key];
  if (!Array.isArray(value) || !value.every((item): item is string => typeof item === "string")) {
    throw new ValidationError(`${context}.${key} must be an array of strings`);
  }
  return value;
}

export function expectArray(record: JsonRecord, key: string, context: string): unknown[] {
  const value = record[key];
  if (!Array.isArray(value)) {
    throw new ValidationError(`${context}.${key} must be an array`);
  }
  return value;
}

export function expectNonNegativeInteger(record: JsonRecord, key: string, context: string): number {
  const value = record[key];
  if (typeof value !== "number" || !Number.isInteger(value) || value < 0) {
    throw new ValidationError(`${context}.${key} must be a non-negative integer`);
  }
  return value;
}

export function isOneOf<T extends string>(values: readonly T[], value: string): value is T {
  return (values as readonly string[]).includes(value);
}

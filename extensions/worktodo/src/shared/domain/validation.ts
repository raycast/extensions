import { DomainError, type DomainErrorCode, type DueValue } from "./model";

const UUID_V4_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const CALENDAR_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
export const MAX_REPRESENTABLE_TIMESTAMP_MS = 8_640_000_000_000_000;

export function validateId(value: unknown): string {
  if (typeof value !== "string" || !UUID_V4_PATTERN.test(value)) {
    throw new DomainError("INVALID_ARGUMENT", "Expected a lowercase UUID v4 ID");
  }
  return value;
}

export function validateText(value: unknown, label: string): string {
  if (typeof value !== "string") {
    throw new DomainError("INVALID_ARGUMENT", `${label} must be text`);
  }
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    throw new DomainError("INVALID_ARGUMENT", `${label} cannot be empty`);
  }
  return trimmed;
}

export function normalizeLabelName(value: string): string {
  return value.normalize("NFKC").toLowerCase();
}

export function validateNotes(value: unknown): string {
  if (typeof value !== "string") {
    throw new DomainError("INVALID_ARGUMENT", "Notes must be text");
  }
  return value;
}

export function validatePriority(value: unknown): boolean {
  if (typeof value !== "boolean") {
    throw new DomainError("INVALID_ARGUMENT", "Priority is invalid");
  }
  return value;
}

export function validateNonNegativeInteger(value: unknown, label: string): number {
  if (!Number.isSafeInteger(value) || Number(value) < 0) {
    throw new DomainError("INVALID_ARGUMENT", `${label} must be a non-negative safe integer`);
  }
  return Number(value);
}

export function validateTimestamp(value: unknown, label: string, code: DomainErrorCode = "INVALID_ARGUMENT"): number {
  if (!Number.isSafeInteger(value) || Number(value) < 0 || Number(value) > MAX_REPRESENTABLE_TIMESTAMP_MS) {
    throw new DomainError(code, `${label} must be a representable Unix-millisecond timestamp`);
  }
  return Number(value);
}

function isLeapYear(year: number): boolean {
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
}

export function validateCalendarDate(value: unknown): string {
  if (typeof value !== "string") {
    throw new DomainError("INVALID_DUE_VALUE", "All-day due date must be text");
  }
  const match = CALENDAR_DATE_PATTERN.exec(value);
  if (!match) {
    throw new DomainError("INVALID_DUE_VALUE", "All-day due date must use YYYY-MM-DD");
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const monthLengths = [31, isLeapYear(year) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  if (year < 1 || year > 9_999 || month < 1 || month > 12 || day < 1 || day > monthLengths[month - 1]) {
    throw new DomainError("INVALID_DUE_VALUE", "All-day due date is not a real Gregorian date");
  }
  return value;
}

export function canonicalizeTimeZone(value: unknown): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new DomainError("INVALID_DUE_VALUE", "Timed due value requires a timezone");
  }
  try {
    return new Intl.DateTimeFormat("en-US", { timeZone: value }).resolvedOptions().timeZone;
  } catch {
    throw new DomainError("INVALID_DUE_VALUE", "Timed due timezone is invalid");
  }
}

export function validateDueValue(value: unknown): DueValue {
  if (typeof value !== "object" || value === null || !("kind" in value)) {
    throw new DomainError("INVALID_DUE_VALUE", "Due value is invalid");
  }
  if (value.kind === "none") {
    return { kind: "none" };
  }
  if (value.kind === "allDay" && "date" in value) {
    return { kind: "allDay", date: validateCalendarDate(value.date) };
  }
  if (value.kind === "timed" && "instantMs" in value && "timeZone" in value) {
    return {
      kind: "timed",
      instantMs: validateTimestamp(value.instantMs, "Timed due instant", "INVALID_DUE_VALUE"),
      timeZone: canonicalizeTimeZone(value.timeZone),
    };
  }
  throw new DomainError("INVALID_DUE_VALUE", "Due value fields do not match its kind");
}

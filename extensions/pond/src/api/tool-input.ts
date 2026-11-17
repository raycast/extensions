import type { ApiCursor } from "pond-api";

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

/** Dates without a time are read as UTC midnight so the same prompt gives the same range anywhere. */
export function parseSavedSince(value: string | undefined): number | undefined {
  const trimmed = value?.trim();
  if (!trimmed) return undefined;
  const time = Date.parse(DATE_ONLY.test(trimmed) ? `${trimmed}T00:00:00Z` : trimmed);
  if (Number.isNaN(time) || time < 0) throw new Error(`"${trimmed}" isn't a date. Use a format like 2026-10-01.`);
  return time;
}

export function encodeCursor(cursor: ApiCursor | null): string | null {
  return cursor ? Buffer.from(JSON.stringify(cursor)).toString("base64url") : null;
}

/** Pond validates the cursor itself, so a tampered one fails there with a clear error. */
export function decodeCursor(value: string | undefined): ApiCursor | undefined {
  if (!value) return undefined;
  try {
    return JSON.parse(Buffer.from(value, "base64url").toString("utf8"));
  } catch {
    throw new Error("That cursor isn't valid. Run the search again without a cursor.");
  }
}

export function clampLimit(value: number | undefined, fallback: number, max: number): number {
  if (!value || !Number.isFinite(value)) return fallback;
  return Math.min(Math.max(1, Math.round(value)), max);
}

import { getPreferenceValues } from "@raycast/api";
import type { Upload } from "../api/types";

/** The auto-delete times Aktar accepts, in days. 0 keeps the file forever. */
export const DELETE_AFTER_OPTIONS = [
  { days: 0, title: "Never" },
  { days: 1, title: "1 Day" },
  { days: 7, title: "7 Days" },
  { days: 14, title: "14 Days" },
  { days: 30, title: "30 Days" },
] as const;

/** A dropdown value ("7") as days, falling back to 0 (never) for anything unexpected. */
export function parseExpiry(value: string | undefined) {
  const days = Number.parseInt(value ?? "", 10);
  return DELETE_AFTER_OPTIONS.some((option) => option.days === days) ? days : 0;
}

/** The Delete After preference, in days (0 = never). */
export function preferredExpiry() {
  return parseExpiry(getPreferenceValues<Preferences>().deleteAfter);
}

/** "Oct 6", or "Oct 6, 2027" when it's not this year. */
export function formatExpiryDate(expiresAt: string) {
  const date = new Date(expiresAt);
  const sameYear = date.getFullYear() === new Date().getFullYear();
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: sameYear ? undefined : "numeric",
  });
}

/**
 * Aktar versions before 0.5.0 ignore `expires` and answer without an
 * `expiresAt` field, so the file was kept forever.
 */
export function ignoredExpiry(uploads: Upload[], expires: number | undefined) {
  return Boolean(expires) && uploads.some((upload) => upload.expiresAt === undefined);
}

export const EXPIRY_UNSUPPORTED_MESSAGE = "Update Aktar to 0.5.0 or later to use Delete After. It was kept forever.";

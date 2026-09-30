import { getPreferenceValues } from "@raycast/api";
import { AktarError } from "../api/client";
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
 * Why a Delete After request didn't take, or undefined when every upload got
 * an expiry. Aktar versions before 0.5.0 ignore `expires` and answer without
 * an `expiresAt` field; a `null` one means Aktar kept the file anyway.
 */
export function expiryWarning(uploads: Upload[], expires: number | undefined) {
  if (!expires) return undefined;
  const kept = uploads.filter((upload) => !upload.expiresAt);
  if (kept.length === 0) return undefined;
  const subject = kept.length === 1 ? (uploads.length === 1 ? "It" : "1 file") : `${kept.length} files`;
  const verb = kept.length === 1 ? "was" : "were";
  if (kept.some((upload) => upload.expiresAt === undefined)) {
    return `Update Aktar to 0.5.0 or later to use Delete After. ${subject} ${verb} kept forever.`;
  }
  return `Aktar didn't apply Delete After. ${subject} ${verb} kept forever.`;
}

/**
 * Aktar refuses `expires` for a destination whose bucket doesn't have its
 * lifecycle rules yet. That answer is a 409, but so is an upload cancelled in
 * Aktar, so the message tells them apart. It applies to the whole
 * destination, so every other file in a batch would fail the same way.
 */
export function isExpiryNotSetUp(error: unknown) {
  return error instanceof AktarError && error.status === 409 && error.message.startsWith("Auto-delete isn't set up");
}

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
 * Why a Delete After request didn't take as asked, or undefined when every
 * upload got the expiry it asked for. Aktar versions before 0.5.0 ignore
 * `expires` and answer without an `expiresAt` field; a `null` one means Aktar
 * kept the file anyway. A reused upload keeps the expiry of the earlier
 * upload, so it's checked against what was asked for, in both directions.
 */
export function expiryWarning(uploads: Upload[], expires: number | undefined) {
  if (!expires) return undefined;
  const subjectFor = (count: number) => (count === 1 ? (uploads.length === 1 ? "It" : "1 file") : `${count} files`);
  const verbFor = (count: number) => (count === 1 ? "was" : "were");

  const kept = uploads.filter((upload) => !upload.expiresAt);
  if (kept.length > 0) {
    const subject = subjectFor(kept.length);
    if (kept.some((upload) => upload.expiresAt === undefined)) {
      return `Update Aktar to 0.5.0 or later to use Delete After. ${subject} ${verbFor(kept.length)} kept forever.`;
    }
    return `Aktar didn't apply Delete After. ${subject} ${verbFor(kept.length)} kept forever.`;
  }

  const different = uploads.filter((upload) => upload.reused && !expiresAsAsked(upload, expires));
  if (different.length > 0) {
    const asked = `in ${expires} ${expires === 1 ? "day" : "days"}`;
    if (different.length === 1) {
      const date = formatExpiryDate(different[0].expiresAt as string);
      return `${subjectFor(1)} was already uploaded, so it's deleted on ${date}, not ${asked}.`;
    }
    return `${subjectFor(different.length)} were already uploaded, so they keep their earlier delete dates, not ${asked}.`;
  }
  return undefined;
}

/**
 * True when the upload is deleted about `days` from now. Lifecycle rules run
 * once a day, so a day either way still counts as what was asked for.
 */
function expiresAsAsked(upload: Upload, days: number) {
  if (!upload.expiresAt) return false;
  const DAY = 24 * 60 * 60 * 1000;
  const difference = new Date(upload.expiresAt).getTime() - (Date.now() + days * DAY);
  return Math.abs(difference) <= DAY;
}

/** ". Deleted on Oct 6" for an upload that expires, otherwise empty. */
export function expiryNote(upload: Upload) {
  return upload.expiresAt ? `. Deleted on ${formatExpiryDate(upload.expiresAt)}` : "";
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

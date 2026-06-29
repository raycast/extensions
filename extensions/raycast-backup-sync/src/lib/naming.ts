import * as os from "os";

/** Archive naming convention shared by backup, restore, and management. */
export const ZIP_PREFIX = "raycast-backup-";
export const ZIP_SUFFIX = ".zip";
export const META_SUFFIX = ".meta.json";

/** Turn an ISO timestamp into a filesystem-safe token, e.g. 2026-06-30T14-32-15-123Z. */
export function timestampForName(iso: string): string {
  return iso.replace(/[:.]/g, "-");
}

/** Device folder name: user override, else hostname, sanitised for Drive. */
export function resolveDeviceName(preferenceValue?: string): string {
  const raw = preferenceValue?.trim() || os.hostname() || "Unknown-Device";
  // Strip a trailing ".local" and characters awkward in folder names.
  return raw
    .replace(/\.local$/i, "")
    .replace(/[/\\]/g, "-")
    .trim();
}

/** Parse the keep-count preference; defaults to 5, clamps negatives to 0 (keep all). */
export function parseKeepCount(value?: string): number {
  const parsed = Number.parseInt((value ?? "").trim(), 10);
  if (Number.isNaN(parsed)) return 5;
  return Math.max(0, parsed);
}

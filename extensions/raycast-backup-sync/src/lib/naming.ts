import * as os from "os";

/** Turn an ISO timestamp into a filesystem-safe token, e.g. 2026-06-30T14-32-15-123Z. */
export function timestampForName(iso: string): string {
  return iso.replace(/[:.]/g, "-");
}

/** Device identifier stored on each backup row: user override, else hostname. */
export function resolveDeviceName(preferenceValue?: string): string {
  const raw = preferenceValue?.trim() || os.hostname() || "Unknown-Device";
  return raw.replace(/\.local$/i, "").trim();
}

/** Parse the keep-count preference; defaults to 5, clamps negatives to 0 (keep all). */
export function parseKeepCount(value?: string): number {
  const parsed = Number.parseInt((value ?? "").trim(), 10);
  if (Number.isNaN(parsed)) return 5;
  return Math.max(0, parsed);
}

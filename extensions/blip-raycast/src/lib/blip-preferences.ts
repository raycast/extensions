/**
 * Blip's own settings, exposed as Raycast extension preferences.
 * Raycast preferences can't show Blip's current values, so each one defaults to "keep". A setting
 * is pushed into Blip only when it was changed in Raycast since it was last pushed, and differs from
 * what Blip has. So a change made later in Blip itself is respected, not silently undone.
 */
import type { Config } from "./types";

type Toggle = "keep" | "on" | "off";

export interface BlipPreferenceValues {
  autoAccept?: Toggle;
  saveToPhotos?: Toggle;
  saveFolder?: string;
  uploadLimitMbps?: string;
  downloadLimitMbps?: string;
}

export type ConfigChange =
  | { event: "autoAccept"; value: boolean }
  | { event: "saveToPhotos"; value: boolean }
  | { event: "saveFolder"; value: string }
  | { event: "speedLimits"; uploadMbps: number; downloadMbps: number };

/** Blip stores limits as 32-bit numbers; anything near that is a typo, not a real link speed. */
const MAX_LIMIT_MBPS = 100_000;

/** Empty keeps Blip's value; otherwise a whole number of Mbps, 0 meaning unlimited. */
function parseLimit(value: string | undefined): number | "keep" | "invalid" {
  const trimmed = (value ?? "").trim();
  if (!trimmed) return "keep";
  const n = Number(trimmed);
  return Number.isInteger(n) && n >= 0 && n <= MAX_LIMIT_MBPS ? n : "invalid";
}

const KEEP: Required<BlipPreferenceValues> = {
  autoAccept: "keep",
  saveToPhotos: "keep",
  saveFolder: "",
  uploadLimitMbps: "",
  downloadLimitMbps: "",
};

export function pendingConfigChanges(
  current: BlipPreferenceValues,
  config: Config,
  { supportsPhotos, lastApplied = {} }: { supportsPhotos: boolean; lastApplied?: BlipPreferenceValues },
): {
  changes: ConfigChange[];
  problems: string[];
  /** What to remember as pushed once `changes` are applied: the current values, except invalid ones. */
  applied: BlipPreferenceValues;
} {
  const changes: ConfigChange[] = [];
  const problems: string[] = [];
  const applied: BlipPreferenceValues = { ...current };
  // Settings unchanged in Raycast since they were last pushed are left to Blip.
  const prefs = { ...current };
  for (const key of Object.keys(KEEP) as (keyof BlipPreferenceValues)[]) {
    if ((current[key] ?? KEEP[key]) === (lastApplied[key] ?? KEEP[key])) (prefs[key] as string) = KEEP[key];
  }

  if (prefs.autoAccept === "on" || prefs.autoAccept === "off") {
    const wanted = prefs.autoAccept === "on";
    if (wanted !== !config.auto_accept_disabled) changes.push({ event: "autoAccept", value: wanted });
  }
  if (supportsPhotos && (prefs.saveToPhotos === "on" || prefs.saveToPhotos === "off")) {
    const wanted = prefs.saveToPhotos === "on";
    if (wanted !== config.auto_save_media_to_library) changes.push({ event: "saveToPhotos", value: wanted });
  }
  const folder = prefs.saveFolder?.trim();
  if (folder && folder !== config.custom_default_save_path) changes.push({ event: "saveFolder", value: folder });

  const upload = parseLimit(prefs.uploadLimitMbps);
  const download = parseLimit(prefs.downloadLimitMbps);
  const rule = `a whole number from 0 (no limit) to ${MAX_LIMIT_MBPS.toLocaleString("en-US")}`;
  if (upload === "invalid") {
    problems.push(`Sending Speed Limit must be ${rule}.`);
    applied.uploadLimitMbps = lastApplied.uploadLimitMbps;
  }
  if (download === "invalid") {
    problems.push(`Receiving Speed Limit must be ${rule}.`);
    applied.downloadLimitMbps = lastApplied.downloadLimitMbps;
  }
  const nextUpload = typeof upload === "number" ? upload : config.limit_upload_mbps;
  const nextDownload = typeof download === "number" ? download : config.limit_download_mbps;
  if (nextUpload !== config.limit_upload_mbps || nextDownload !== config.limit_download_mbps) {
    changes.push({ event: "speedLimits", uploadMbps: nextUpload, downloadMbps: nextDownload });
  }
  return { changes, problems, applied };
}

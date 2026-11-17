/**
 * Blip's own settings, exposed as Raycast extension preferences.
 * Raycast preferences can't show Blip's current values, so each one defaults to "keep" and is
 * only pushed into Blip when it is set and differs from what Blip has.
 */
import type { Config } from "./types";

export type Toggle = "keep" | "on" | "off";

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

/** Empty keeps Blip's value; otherwise a whole number of Mbps, 0 meaning unlimited. */
export function parseLimit(value: string | undefined): number | "keep" | "invalid" {
  const trimmed = (value ?? "").trim();
  if (!trimmed) return "keep";
  const n = Number(trimmed);
  return Number.isInteger(n) && n >= 0 ? n : "invalid";
}

export function pendingConfigChanges(
  prefs: BlipPreferenceValues,
  config: Config,
  { supportsPhotos }: { supportsPhotos: boolean },
): { changes: ConfigChange[]; problems: string[] } {
  const changes: ConfigChange[] = [];
  const problems: string[] = [];

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
  if (upload === "invalid") problems.push("Sending speed limit must be a whole number of Mbps (0 = unlimited).");
  if (download === "invalid") problems.push("Receiving speed limit must be a whole number of Mbps (0 = unlimited).");
  const nextUpload = typeof upload === "number" ? upload : config.limit_upload_mbps;
  const nextDownload = typeof download === "number" ? download : config.limit_download_mbps;
  if (nextUpload !== config.limit_upload_mbps || nextDownload !== config.limit_download_mbps) {
    changes.push({ event: "speedLimits", uploadMbps: nextUpload, downloadMbps: nextDownload });
  }
  return { changes, problems };
}

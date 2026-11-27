/**
 * Reads the native app's own recording settings from its macOS preferences
 * (the same values shown in the app's settings window).
 */

import { execFileSync } from "child_process";

const APP_PREFERENCES_DOMAIN = "uk.co.bzwrd.macperfmonitor";

/** The app's recording settings that decide what the charts can show. */
export interface RecordingSettings {
  /** How long raw samples are kept, in seconds. */
  rawRetentionSeconds: number;
  /** How often a raw sample is written, in seconds. */
  rawIntervalSeconds: number;
}

/**
 * Reads one number from the app's preferences, or returns the app's built-in default.
 * A key only exists once the user has changed that setting in the app; until then
 * `defaults` exits with an error and the app itself uses its built-in value.
 */
function readSetting(key: string, appDefault: number): number {
  try {
    const output = execFileSync("/usr/bin/defaults", ["read", APP_PREFERENCES_DOMAIN, key], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    });
    return Number(output.trim());
  } catch {
    return appDefault;
  }
}

/**
 * Reads the raw-sample settings. The key names and defaults (2 hours, 10 seconds)
 * come from SamplerModel.swift in the app.
 */
export function readRecordingSettings(): RecordingSettings {
  return {
    rawRetentionSeconds: readSetting("logging.highResAgeSeconds", 7200),
    rawIntervalSeconds: readSetting("logging.highResIntervalSeconds", 10),
  };
}

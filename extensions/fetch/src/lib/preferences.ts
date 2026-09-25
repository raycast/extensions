import { homedir } from "os";
import { join } from "path";
import { getPreferenceValues } from "@raycast/api";
import { logDebug, logWarn } from "./logger";

/**
 * Preferences after parsing and validation. Distinct from the ambient
 * `Preferences` type generated into `raycast-env.d.ts`, where the numeric
 * fields arrive as raw strings.
 */
export interface ResolvedPreferences {
  outputDirectory: string;
  followRedirects: boolean;
  defaultTimeout: number;
  overwriteExisting: boolean;
  verboseLogging: boolean;
  maxParallelDownloads: number;
}

let cachedPreferences: ResolvedPreferences | null = null;

export function getPreferences(): ResolvedPreferences {
  if (cachedPreferences) {
    return cachedPreferences;
  }

  const raw = getPreferenceValues<Preferences>();

  // Resolve output directory with fallback
  let outputDirectory = raw.outputDirectory || join(homedir(), "Downloads");
  if (outputDirectory.startsWith("~")) {
    outputDirectory = outputDirectory.replace("~", homedir());
  }

  // Parse timeout with validation
  let defaultTimeout = 300;
  if (raw.defaultTimeout) {
    const parsed = parseInt(raw.defaultTimeout, 10);
    if (isNaN(parsed) || parsed <= 0) {
      logWarn("Invalid timeout value, using default", { provided: raw.defaultTimeout, default: 300 });
    } else {
      defaultTimeout = parsed;
    }
  }

  // Parse max parallel downloads with validation
  let maxParallelDownloads = 3;
  if (raw.maxParallelDownloads) {
    const parsed = parseInt(raw.maxParallelDownloads, 10);
    if (isNaN(parsed) || parsed <= 0) {
      logWarn("Invalid maxParallelDownloads value, using default", {
        provided: raw.maxParallelDownloads,
        default: 3,
      });
    } else {
      maxParallelDownloads = Math.min(parsed, 10); // Cap at 10 to be reasonable
    }
  }

  cachedPreferences = {
    outputDirectory,
    followRedirects: raw.followRedirects ?? true,
    defaultTimeout,
    overwriteExisting: raw.overwriteExisting ?? false,
    verboseLogging: raw.verboseLogging ?? false,
    maxParallelDownloads,
  };

  logDebug("Preferences loaded", { ...cachedPreferences });

  return cachedPreferences;
}

export function clearPreferencesCache(): void {
  cachedPreferences = null;
}

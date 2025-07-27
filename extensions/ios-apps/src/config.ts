import { getPreferenceValues } from "@raycast/api";
import { logger } from "./utils/logger";

// Integrity verification options
export type IntegrityVerification = "basic" | "checksum" | "off";

// Configuration interface for return values
export interface Config {
  maxDownloadTimeout: number; // in milliseconds
  maxStallTimeout: number; // in milliseconds without progress
  tempCleanupOnExit: boolean;
  integrityVerification: IntegrityVerification;
}

// Preferences interface (what comes from Raycast preferences)
interface Preferences {
  downloadTimeoutSeconds: string;
  maxStallTimeout: string;
  tempCleanupOnExit: boolean;
  integrityVerification: IntegrityVerification;
}

// Default configuration values (all defaults live in code except downloadTimeoutSeconds)
const defaultConfig: Config = {
  maxDownloadTimeout: 90000, // 90 seconds in milliseconds
  maxStallTimeout: 30000, // 30 seconds in milliseconds
  tempCleanupOnExit: true,
  integrityVerification: "basic",
};

/**
 * Get configuration values from preferences with fallback to defaults
 * @returns Configuration object with all settings
 */
export function getConfig(): Config {
  try {
    const preferences = getPreferenceValues<Preferences>();

    // maxDownloadTimeout comes from downloadTimeoutSeconds preference (converted to ms)
    const downloadTimeoutSeconds = parseInt(preferences.downloadTimeoutSeconds || "90", 10);
    const maxDownloadTimeout = Math.max(downloadTimeoutSeconds, 30) * 1000; // minimum 30 seconds

    // maxStallTimeout from preference (already in ms)
    const maxStallTimeout = parseInt(preferences.maxStallTimeout || "30000", 10);
    const validatedStallTimeout = Math.max(maxStallTimeout, 5000); // minimum 5 seconds

    // tempCleanupOnExit from preference
    const tempCleanupOnExit = preferences.tempCleanupOnExit ?? defaultConfig.tempCleanupOnExit;

    // integrityVerification from preference
    const integrityVerification = preferences.integrityVerification || defaultConfig.integrityVerification;

    return {
      maxDownloadTimeout,
      maxStallTimeout: validatedStallTimeout,
      tempCleanupOnExit,
      integrityVerification,
    };
  } catch (error) {
    logger.error("[Config] Error reading preferences, using defaults:", error);
    return defaultConfig;
  }
}

/**
 * Get a specific configuration value
 * @param key The configuration key to retrieve
 * @returns The configuration value
 */
export function getConfigValue<K extends keyof Config>(key: K): Config[K] {
  const config = getConfig();
  return config[key];
}

/**
 * Log current configuration for debugging
 */
export function logCurrentConfig(): void {
  try {
    const config = getConfig();
    logger.log("[Config] Current configuration:", {
      maxDownloadTimeout: `${config.maxDownloadTimeout}ms (${config.maxDownloadTimeout / 1000}s)`,
      maxStallTimeout: `${config.maxStallTimeout}ms (${config.maxStallTimeout / 1000}s)`,
      tempCleanupOnExit: config.tempCleanupOnExit,
      integrityVerification: config.integrityVerification,
    });
  } catch (error) {
    logger.error("[Config] Error logging configuration:", error);
  }
}

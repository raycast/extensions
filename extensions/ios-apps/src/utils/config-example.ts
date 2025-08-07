/**
 * Example usage of the configuration module
 * This file demonstrates how to use the config module in different scenarios
 */

import { getConfig, getConfigValue, logCurrentConfig, IntegrityVerification } from "../config";
import { logger } from "./logger";

/**
 * Example: Using config in a download function
 */
export async function exampleDownloadFunction(url: string): Promise<boolean> {
  try {
    // Get all config values at once
    const config = getConfig();

    logger.log(`[Config Example] Starting download with config:`, {
      maxDownloadTimeout: `${config.maxDownloadTimeout}ms`,
      maxStallTimeout: `${config.maxStallTimeout}ms`,
      tempCleanupOnExit: config.tempCleanupOnExit,
      integrityVerification: config.integrityVerification,
    });

    // Use timeout for fetch with AbortController
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), config.maxDownloadTimeout);

    try {
      // Simulate download
      const response = await fetch(url, { signal: controller.signal });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      // Handle integrity verification based on config
      if (config.integrityVerification !== "off") {
        await performIntegrityCheck(response, config.integrityVerification);
      }

      // Handle cleanup based on config
      if (config.tempCleanupOnExit) {
        await cleanupTempFiles();
      }

      return true;
    } finally {
      clearTimeout(timeoutId);
    }
  } catch (error) {
    logger.error("[Config Example] Download failed:", error);
    return false;
  }
}

/**
 * Example: Using individual config values
 */
export function exampleUsingIndividualValues() {
  // Get specific config values when you only need one or two
  const downloadTimeout = getConfigValue("maxDownloadTimeout");
  const stallTimeout = getConfigValue("maxStallTimeout");

  logger.log(`[Config Example] Using individual timeouts: download=${downloadTimeout}ms, stall=${stallTimeout}ms`);

  // Use in your logic
  if (downloadTimeout > 60000) {
    logger.log("[Config Example] Long timeout configured, enabling extended retry logic");
  }
}

/**
 * Example: Logging current configuration for debugging
 */
export function exampleLogConfig() {
  logger.log("[Config Example] === Current Configuration ===");
  logCurrentConfig();
  logger.log("[Config Example] ===============================");
}

/**
 * Mock integrity check function
 */
async function performIntegrityCheck(response: Response, verification: IntegrityVerification): Promise<void> {
  switch (verification) {
    case "basic":
      // Basic checks like content-length, content-type
      logger.log("[Config Example] Performing basic integrity check");
      if (!response.headers.get("content-length")) {
        throw new Error("Missing content-length header");
      }
      break;

    case "checksum":
      // More thorough checksum verification
      logger.log("[Config Example] Performing checksum verification");
      // Implementation would verify checksums here
      break;

    case "off":
      // No verification
      break;
  }
}

/**
 * Mock cleanup function
 */
async function cleanupTempFiles(): Promise<void> {
  logger.log("[Config Example] Cleaning up temporary files");
  // Implementation would clean up temp files here
}

/**
 * Example: React hook-style usage in a component
 */
export function useDownloadConfig() {
  const config = getConfig();

  return {
    isLongTimeout: config.maxDownloadTimeout > 60000,
    isIntegrityEnabled: config.integrityVerification !== "off",
    shouldCleanup: config.tempCleanupOnExit,
    timeoutSeconds: Math.floor(config.maxDownloadTimeout / 1000),
    stallTimeoutSeconds: Math.floor(config.maxStallTimeout / 1000),
  };
}

/**
 * Deploy Key Authentication for Raycast
 *
 * Provides authentication using Convex deploy keys as an alternative to OAuth.
 * Deploy keys allow direct access to a specific deployment without requiring
 * browser-based authentication.
 *
 * Credentials can be configured via:
 * 1. The "Configure Deploy Key" command (stored in LocalStorage) - preferred
 * 2. Extension Preferences (fallback)
 */

import { getPreferenceValues, LocalStorage } from "@raycast/api";
import { Preferences, STORAGE_KEYS } from "./constants";

/**
 * Configuration from deploy key credentials
 */
export interface DeployKeyConfig {
  /** The full deploy key (e.g., "polite-condor-874|017c7d...") */
  deployKey: string;
  /** The deployment URL (e.g., "https://polite-condor-874.convex.cloud") */
  deploymentUrl: string;
  /** Extracted deployment name (e.g., "polite-condor-874") */
  deploymentName: string;
}

/**
 * Extract deployment name from a Convex URL
 * e.g., "https://polite-condor-874.convex.cloud" -> "polite-condor-874"
 */
export function extractDeploymentNameFromUrl(url: string): string | null {
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname;

    // Handle *.convex.cloud format
    if (hostname.endsWith(".convex.cloud")) {
      return hostname.replace(".convex.cloud", "");
    }

    // Handle *.convex.site format
    if (hostname.endsWith(".convex.site")) {
      return hostname.replace(".convex.site", "");
    }

    // For self-hosted or custom domains, try to use the subdomain
    const parts = hostname.split(".");
    if (parts.length > 1) {
      return parts[0];
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Extract deployment name from a deploy key
 * Deploy key format: "instance-name|encrypted-key" or "prod:instance-name|encrypted-key"
 */
export function extractDeploymentNameFromKey(deployKey: string): string | null {
  const pipeIndex = deployKey.indexOf("|");
  if (pipeIndex === -1) {
    return null;
  }

  const prefix = deployKey.substring(0, pipeIndex);

  // Handle "prod:instance-name" format (CONVEX_DEPLOYMENT style)
  if (prefix.includes(":")) {
    const colonIndex = prefix.indexOf(":");
    return prefix.substring(colonIndex + 1);
  }

  // Direct instance name format
  return prefix;
}

/**
 * Build a DeployKeyConfig from raw values
 */
export function buildDeployKeyConfig(
  deployKey: string,
  deploymentUrl: string,
): DeployKeyConfig | null {
  if (!deployKey || !deploymentUrl) {
    return null;
  }

  // Validate and normalize the URL
  const normalizedUrl = deploymentUrl.startsWith("http")
    ? deploymentUrl
    : `https://${deploymentUrl}`;

  // Try to extract deployment name from URL first, then from key
  let deploymentName = extractDeploymentNameFromUrl(normalizedUrl);
  if (!deploymentName) {
    deploymentName = extractDeploymentNameFromKey(deployKey);
  }

  if (!deploymentName) {
    console.error("Could not extract deployment name from URL or deploy key");
    return null;
  }

  return {
    deployKey,
    deploymentUrl: normalizedUrl,
    deploymentName,
  };
}

/**
 * Get deploy key configuration from Raycast preferences (sync)
 * Returns null if deploy key is not configured in preferences
 */
export function getDeployKeyConfigFromPreferences(): DeployKeyConfig | null {
  try {
    const preferences = getPreferenceValues<Preferences>();
    const { deployKey, deploymentUrl } = preferences;
    return buildDeployKeyConfig(deployKey ?? "", deploymentUrl ?? "");
  } catch (error) {
    console.error("Failed to get deploy key config from preferences:", error);
    return null;
  }
}

/**
 * Get deploy key configuration - checks preferences (sync version)
 * For async version that also checks LocalStorage, use getDeployKeyConfigAsync
 */
export function getDeployKeyConfig(): DeployKeyConfig | null {
  return getDeployKeyConfigFromPreferences();
}

/**
 * Get deploy key configuration from LocalStorage (async)
 * Returns null if not configured
 */
export async function getDeployKeyConfigFromStorage(): Promise<DeployKeyConfig | null> {
  try {
    const [deployKey, deploymentUrl] = await Promise.all([
      LocalStorage.getItem<string>(STORAGE_KEYS.DEPLOY_KEY),
      LocalStorage.getItem<string>(STORAGE_KEYS.DEPLOY_KEY_URL),
    ]);

    if (!deployKey || !deploymentUrl) {
      return null;
    }

    return buildDeployKeyConfig(deployKey, deploymentUrl);
  } catch (error) {
    console.error("Failed to get deploy key config from storage:", error);
    return null;
  }
}

/**
 * Get deploy key configuration - checks LocalStorage first, then preferences (async)
 */
export async function getDeployKeyConfigAsync(): Promise<DeployKeyConfig | null> {
  // Check LocalStorage first (from Configure Deploy Key command)
  const storageConfig = await getDeployKeyConfigFromStorage();
  if (storageConfig) {
    return storageConfig;
  }

  // Fall back to preferences
  return getDeployKeyConfigFromPreferences();
}

/**
 * Save deploy key configuration to LocalStorage
 */
export async function saveDeployKeyConfig(
  deployKey: string,
  deploymentUrl: string,
): Promise<void> {
  await Promise.all([
    LocalStorage.setItem(STORAGE_KEYS.DEPLOY_KEY, deployKey),
    LocalStorage.setItem(STORAGE_KEYS.DEPLOY_KEY_URL, deploymentUrl),
  ]);
}

/**
 * Clear deploy key configuration from LocalStorage
 */
export async function clearDeployKeyConfig(): Promise<void> {
  await Promise.all([
    LocalStorage.removeItem(STORAGE_KEYS.DEPLOY_KEY),
    LocalStorage.removeItem(STORAGE_KEYS.DEPLOY_KEY_URL),
  ]);
}

/**
 * Check if deploy key mode is configured and valid (sync - preferences only)
 */
export function isDeployKeyMode(): boolean {
  return getDeployKeyConfig() !== null;
}

/**
 * Check if deploy key mode is configured (async - checks both storage and preferences)
 */
export async function isDeployKeyModeAsync(): Promise<boolean> {
  const config = await getDeployKeyConfigAsync();
  return config !== null;
}

/**
 * Validate deploy key by making a test request to the deployment
 * Returns true if the key is valid, false otherwise
 */
export async function validateDeployKey(
  config: DeployKeyConfig,
): Promise<{ valid: boolean; error?: string }> {
  try {
    // Try to fetch the shapes2 endpoint which requires authentication
    const response = await fetch(`${config.deploymentUrl}/api/shapes2`, {
      method: "GET",
      headers: {
        Authorization: `Convex ${config.deployKey}`,
        "Content-Type": "application/json",
      },
    });

    if (response.ok) {
      return { valid: true };
    }

    if (response.status === 401 || response.status === 403) {
      return { valid: false, error: "Invalid deploy key or unauthorized" };
    }

    return { valid: false, error: `Unexpected response: ${response.status}` };
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : "Connection failed",
    };
  }
}

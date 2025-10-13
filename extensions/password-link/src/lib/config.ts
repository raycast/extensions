import { getPreferenceValues } from "@raycast/api";
import { PasswordLinkConfig } from "../types";

/**
 * Get password.link configuration from preferences
 * @returns PasswordLinkConfig object with API keys and base URL
 */
export function getPasswordLinkConfig(): PasswordLinkConfig {
  const preferences = getPreferenceValues<{
    publicKey: string;
    privateKey: string;
    baseUrl: string;
  }>();

  return {
    baseUrl: preferences.baseUrl || "https://password.link",
    publicKey: preferences.publicKey,
    privateKey: preferences.privateKey,
  };
}

/**
 * Validate that required configuration is present
 * @returns true if configuration is valid, false otherwise
 */
export function validateConfig(): boolean {
  const config = getPasswordLinkConfig();
  return !!(config.publicKey && config.privateKey && config.baseUrl);
}

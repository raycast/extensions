import { getPreferenceValues } from "@raycast/api";

export interface Preferences {
  apiKey: string;
  apiMode: "test" | "live";
}

export interface AuthConfig {
  apiKey: string;
  baseUrl: string;
  mode: "test" | "live";
}

/**
 * Get authentication configuration from user preferences
 */
export function getAuthConfig(): AuthConfig {
  const preferences = getPreferenceValues<Preferences>();

  const baseUrl = preferences.apiMode === "live" ? "https://live.dodopayments.com" : "https://test.dodopayments.com";

  return {
    apiKey: preferences.apiKey,
    baseUrl,
    mode: preferences.apiMode,
  };
}

/**
 * Validate that authentication is properly configured
 */
export function validateAuth(): { isValid: boolean; error?: string } {
  try {
    const preferences = getPreferenceValues<Preferences>();

    if (!preferences.apiKey || preferences.apiKey.trim() === "") {
      return {
        isValid: false,
        error: "API Key is required. Please configure it in extension preferences.",
      };
    }

    if (!preferences.apiMode || !["test", "live"].includes(preferences.apiMode)) {
      return {
        isValid: false,
        error: "Invalid API mode. Please select either 'test' or 'live'.",
      };
    }

    return { isValid: true };
  } catch {
    return {
      isValid: false,
      error: "Failed to load preferences. Please check your configuration.",
    };
  }
}

/**
 * Get authorization headers for API requests
 */
export function getAuthHeaders(): Record<string, string> {
  const { apiKey } = getAuthConfig();

  return {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
  };
}

/**
 * Create a configured fetch function with authentication
 */
export function createAuthenticatedFetch() {
  const config = getAuthConfig();
  const headers = getAuthHeaders();

  return async (endpoint: string, options: RequestInit = {}) => {
    const url = `${config.baseUrl}${endpoint}`;

    const requestOptions: RequestInit = {
      ...options,
      headers: {
        ...headers,
        ...options.headers,
      },
    };

    return fetch(url, requestOptions);
  };
}

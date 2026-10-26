import { getPreferenceValues } from "@raycast/api";
import { Rerout } from "@rerout/sdk";

interface Preferences {
  apiKey: string;
  baseUrl?: string;
}

/**
 * Construct the Rerout SDK client from the extension's preferences. The SDK is
 * the shared engine across surfaces (CLI and this extension); here the API key
 * comes from Raycast preferences rather than a config file.
 */
export function getClient(): Rerout {
  const { apiKey, baseUrl } = getPreferenceValues<Preferences>();
  const trimmedKey = apiKey.trim();
  const trimmedBaseUrl = baseUrl?.trim();
  return new Rerout({
    apiKey: trimmedKey,
    // Sandbox keys (rrk_test_…) talk to the isolated sandbox; the SDK rejects
    // them unless the environment matches, so pick it from the key itself.
    environment: trimmedKey.startsWith("rrk_test_") ? "sandbox" : "production",
    ...(trimmedBaseUrl ? { baseUrl: trimmedBaseUrl } : {}),
    defaultHeaders: { "user-agent": "rerout-raycast" },
  });
}

/** Human-readable message for an error thrown by the SDK or fetch. */
export function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}

import { open, openExtensionPreferences, type Toast } from "@raycast/api";
import { API_KEY_CONSOLE_URL, BILLING_CONSOLE_URL } from "../constants";

/** Auth failures the Anthropic API reports for a missing, malformed, or revoked key. */
function isAuthError(message: string): boolean {
  const normalized = message.toLowerCase();
  return (
    normalized.includes("authentication") ||
    normalized.includes("invalid x-api-key") ||
    normalized.includes("unauthorized") ||
    normalized.includes("401")
  );
}

/** Quota/billing failures, where a new key won't help but adding credit will. */
function isBillingError(message: string): boolean {
  const normalized = message.toLowerCase();
  return (
    normalized.includes("credit balance") ||
    normalized.includes("quota") ||
    normalized.includes("billing") ||
    normalized.includes("insufficient")
  );
}

/**
 * Builds the most useful follow-up action for an API failure: a route to fix the key for
 * auth errors, to billing for quota errors, and nothing when the error is unrelated —
 * so the action never points somewhere irrelevant to what actually failed.
 */
export function getApiKeyToastAction(errorMessage: string): Toast.ActionOptions | undefined {
  if (isAuthError(errorMessage)) {
    return {
      title: "Open Extension Preferences",
      onAction: async () => {
        await openExtensionPreferences();
      },
    };
  }

  if (isBillingError(errorMessage)) {
    return {
      title: "Open Billing Settings",
      onAction: async () => {
        await open(BILLING_CONSOLE_URL);
      },
    };
  }

  return undefined;
}

/** Where to create a key — used by views that can render a link directly. */
export { API_KEY_CONSOLE_URL };

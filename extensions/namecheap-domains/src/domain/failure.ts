import { NamecheapApiError } from "../namecheap/parse";
import { PREFERENCE_ERROR_NUMBERS } from "../namecheap/parse-hints";

export const errorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error ?? "Unknown error");

/** True when Namecheap rejected the address the request came from. */
export const isWhitelistError = (error: unknown): error is NamecheapApiError =>
  error instanceof NamecheapApiError && error.isWhitelistError;

/** Actionable next step for an error, when there is one. */
export function errorHint(error: unknown): string | undefined {
  if (error instanceof NamecheapApiError && error.hint) return error.hint;
  const message = errorMessage(error);
  if (/IPv4/i.test(message)) return "Set Client IP in the extension preferences to skip auto-detection.";
  if (/API User|API Key/i.test(message)) return "Fill in the extension preferences.";
  return undefined;
}

/**
 * What would actually fix this failure.
 *
 * The recovery decides which action leads on a failure screen. A default action that cannot solve the
 * problem on screen is worse than no default: sending someone to the whitelist page because their API key
 * is wrong wastes the one action they are most likely to press.
 */
export type Recovery = "whitelist" | "preferences" | "retry";

export function recoveryFor(error: unknown): Recovery {
  if (isWhitelistError(error)) return "whitelist";
  if (error instanceof NamecheapApiError) {
    // Retrying a rejected credential changes nothing; anything else may well be transient.
    return PREFERENCE_ERROR_NUMBERS.has(error.number) ? "preferences" : "retry";
  }
  // getClient() and resolveClientIp() throw plain Errors when a preference is absent or malformed.
  return /API User|API Key|Client IP|IPv4/i.test(errorMessage(error)) ? "preferences" : "retry";
}

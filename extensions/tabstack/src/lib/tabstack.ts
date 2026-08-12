import Tabstack, {
  AuthenticationError,
  InternalServerError,
  RateLimitError,
  TabstackError,
  UnprocessableEntityError,
} from "@tabstack/sdk";
import { getPreferenceValues } from "@raycast/api";

/**
 * Build a Tabstack client from the API key stored in Raycast preferences.
 * The key is passed explicitly to the constructor; we never read process.env.
 */
export function getClient(): Tabstack {
  const { apiKey } = getPreferenceValues<Preferences>();
  return new Tabstack({ apiKey });
}

/**
 * Translate any error thrown by the SDK into a short, friendly message.
 * Handles both the typed Tabstack error classes and the in-stream `error`
 * events (which surface as plain Error after the command re-throws them).
 */
export function friendlyError(error: unknown): string {
  if (error instanceof AuthenticationError) {
    return "Authentication failed. Check your API key in extension preferences.";
  }
  if (error instanceof RateLimitError) {
    return "Rate limited. Wait a moment and try again.";
  }
  if (error instanceof UnprocessableEntityError) {
    return "That URL could not be processed. Check it is public and reachable.";
  }
  if (error instanceof InternalServerError) {
    return "Tabstack had a server error. Try again shortly.";
  }
  if (error instanceof TabstackError) {
    return error.message;
  }
  return error instanceof Error ? error.message : String(error);
}

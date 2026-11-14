import { getPreferenceValues } from "@raycast/api";
import { LinkPilot, LinkPilotApiError } from "@uselinkpilot/sdk";

/**
 * One client for both commands.
 *
 * The key is read from Raycast preferences, which stores a `password` field
 * in the OS keychain, so it never sits in a file this extension owns.
 * `Preferences` is the type Raycast generates from package.json at build time
 * (raycast-env.d.ts), so it cannot drift from the manifest.
 */
export function client(): LinkPilot {
  const { apiKey } = getPreferenceValues<Preferences>();
  return new LinkPilot({ apiKey: apiKey.trim() });
}

/**
 * The API writes for a JSON reader: it names the offending field in
 * backticks and prefixes the reason with it. A toast is a sentence someone
 * reads at a glance, so drop the field name and keep the reason.
 */
function plainly(message: string): string {
  return message.replace(/^`[^`]+` rejected:\s*/, "").replace(/`/g, "");
}

/**
 * Turn an API failure into something worth showing a person.
 *
 * Raycast surfaces this in a toast, which is a single line someone reads at
 * a glance, so it has to say what to do rather than what went wrong. A plan
 * limit and a bad key are both "an error" and need completely different
 * responses.
 */
export function describe(error: unknown): { title: string; message: string } {
  if (error instanceof LinkPilotApiError) {
    if (error.code === "unauthorized") {
      return {
        title: "API key rejected",
        message: "Check the key in this extension's preferences. Keys start with lp_live_.",
      };
    }
    if (error.needsUpgrade) {
      return {
        title: "Plan limit reached",
        message: error.message + " Retrying will not help.",
      };
    }
    if (error.code === "rate_limited") {
      const wait = error.retryAfterSeconds;
      return {
        title: "Rate limited",
        message: wait ? `Wait ${wait}s and try again.` : "Wait a moment and try again.",
      };
    }
    if (error.isDisabled) {
      return { title: "API is switched off", message: "Retrying will not help until it is enabled." };
    }
    if (error.code === "invalid_request") {
      // Every URL the API refuses arrives as this code: a destination that
      // points back at the shortener, a private or raw-IP host, a flagged
      // destination. Without a branch here they all showed up as the generic
      // "LinkPilot error", which says nothing about what to change.
      return { title: "That URL was refused", message: plainly(error.message) };
    }
    return { title: "LinkPilot error", message: error.message };
  }
  return {
    title: "Something went wrong",
    message: error instanceof Error ? error.message : String(error),
  };
}

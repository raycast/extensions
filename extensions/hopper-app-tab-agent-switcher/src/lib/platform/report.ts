import { captureException, environment } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";

/**
 * Sends `error` to the Developer Hub (https://www.raycast.com/extension-issues), labeled with `context` (what
 * failed, e.g. "tabs: chromium": an AppleScript or sqlite error's stack doesn't say which source ran it). Raycast
 * reports only unhandled errors on its own, and Hopper handles all of them, so every catch that hides a failure
 * calls this (ADR-029).
 */
export function reportError(error: unknown, context: string): void {
  const cause = error instanceof Error ? error : new Error(String(error));
  const reported = new Error(`${context}: ${cause.message}`);
  reported.name = cause.name;
  // The original frames under the labeled message.
  reported.stack = [`${reported.name}: ${reported.message}`, ...(cause.stack?.match(/^\s+at .*$/gm) ?? [])].join("\n");
  if (environment.isDevelopment) console.error(`REPORT ${reported.stack}`);
  captureException(reported);
}

/** Tells the user, and reports the error. `context` defaults to `title`: keep it free of tab titles. */
export async function showFailure(error: unknown, title: string, context = title): Promise<void> {
  reportError(error, context);
  await showFailureToast(error, { title });
}

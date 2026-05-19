import { getPreferenceValues } from "@raycast/api";

let cached: boolean | null = null;
function isVerbose(): boolean {
  if (cached !== null) return cached;
  try {
    cached = Boolean(getPreferenceValues<Preferences>().verboseLogging);
  } catch {
    cached = false;
  }
  return cached;
}

export const rsvpLog = {
  debug: (...args: unknown[]) => {
    if (isVerbose()) console.log("[RSVP]", ...args);
  },
  warn: (...args: unknown[]) => {
    console.warn("[RSVP]", ...args);
  },
  error: (...args: unknown[]) => {
    console.error("[RSVP]", ...args);
  },
};

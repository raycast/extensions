import { getPreferenceValues } from "@raycast/api";

interface Prefs {
  verboseLogging?: boolean;
}

let cached: boolean | null = null;
function isVerbose(): boolean {
  if (cached !== null) return cached;
  try {
    cached = Boolean(getPreferenceValues<Prefs>().verboseLogging);
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

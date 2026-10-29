import { runCandidateScript } from "../utils/apple-script";
import { getStandardTabsScript } from "../utils/scripts";
import type { MeetingUrlSource } from "./types";

/**
 * Reads Safari, whose AppleScript dictionary supports enumerating
 * `tabs of window` for every window, not just the active tab of the front
 * window.
 */
export function createStandardTabsAdapter(appName: string): MeetingUrlSource {
  return {
    usesClipboardFallback: false,
    async getCandidateUrls() {
      return runCandidateScript(getStandardTabsScript(appName));
    },
  };
}

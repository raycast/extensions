import { runCandidateScript } from "../utils/apple-script";
import { getStandardTabsScript } from "../utils/scripts";
import type { MeetingUrlSource } from "./types";

/**
 * Shared implementation for Safari and Chromium-family browsers, whose
 * AppleScript dictionaries both support enumerating `tabs of window` for
 * every window, not just the active tab of the front window.
 */
export function createStandardTabsAdapter(appName: string): MeetingUrlSource {
  return {
    usesClipboardFallback: false,
    async getCandidateUrls() {
      return runCandidateScript(getStandardTabsScript(appName));
    },
  };
}

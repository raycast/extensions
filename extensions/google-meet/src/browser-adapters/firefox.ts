import { Clipboard } from "@raycast/api";
import { runAppleScriptSafe } from "../utils/apple-script";
import { getFocusAddressBarScript } from "../utils/scripts";
import type { MeetingUrlSource } from "./types";

/**
 * Minimum time between actual address-bar lookups. Unlike the other
 * adapters' AppleScript, each lookup here visibly steals focus and flashes
 * the address bar open/closed, so it can't run on the orchestrator's normal
 * (much shorter) polling cadence without being disruptive. Calls that land
 * inside the cooldown just report "no candidates yet" instead of skipping
 * their turn silently, so the orchestrator's own timeout still applies.
 */
const MIN_LOOKUP_INTERVAL_MS = 2_000;

/**
 * Firefox-family browsers have little to no AppleScript support, so the URL
 * is read by focusing the address bar and copying it to the system
 * clipboard. This is why `usesClipboardFallback` is true: the orchestrator
 * saves the user's real clipboard contents before polling starts and
 * restores them if meeting creation ultimately fails, so a transient
 * intermediate URL (or the user's own copied text) is never left behind.
 */
export function createFirefoxFamilyAdapter(appName: string): MeetingUrlSource {
  let lastLookupAt = 0;

  return {
    usesClipboardFallback: true,
    async getCandidateUrls() {
      const now = Date.now();
      if (now - lastLookupAt < MIN_LOOKUP_INTERVAL_MS) {
        return [];
      }
      lastLookupAt = now;

      await runAppleScriptSafe(getFocusAddressBarScript(appName));
      const candidate = await Clipboard.readText();
      return candidate ? [candidate] : [];
    },
  };
}

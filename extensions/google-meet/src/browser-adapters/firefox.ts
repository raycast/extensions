import { Clipboard } from "@raycast/api";
import { runAppleScriptSafe } from "../utils/apple-script";
import { getFocusAddressBarScript } from "../utils/scripts";
import type { MeetingUrlSource } from "./types";

/**
 * Firefox-family browsers have little to no AppleScript support, so the URL
 * is read by focusing the address bar and copying it to the system
 * clipboard. This is why `usesClipboardFallback` is true: the orchestrator
 * saves the user's real clipboard contents before polling starts and
 * restores them if meeting creation ultimately fails, so a transient
 * intermediate URL (or the user's own copied text) is never left behind.
 */
export function createFirefoxFamilyAdapter(appName: string): MeetingUrlSource {
  return {
    usesClipboardFallback: true,
    async getCandidateUrls() {
      await runAppleScriptSafe(getFocusAddressBarScript(appName));
      const candidate = await Clipboard.readText();
      return candidate ? [candidate] : [];
    },
  };
}

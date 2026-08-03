import { MeetError } from "../errors";
import { runAppleScriptSafe, runCandidateScript } from "../utils/apple-script";
import { getArcFamilyTabsScript, getSystemEventsWindowCountScript, UNSCRIPTABLE_WINDOW_MARKER } from "../utils/scripts";
import type { MeetingUrlSource } from "./types";

/**
 * Arc and Dia (both built by The Browser Company) share the same nested
 * `tell window i` scripting quirk. This also has to account for Arc's
 * "Air Traffic Control" routing `meet.google.com` into a Little Arc window:
 * Little Arc either isn't enumerated by Arc's own `windows` list at all, or
 * is enumerated but errors when its `active tab` is queried. Both cases are
 * treated as an unsupported-detection condition rather than a generic
 * timeout.
 *
 * This heuristic could not be verified against a live Little Arc window
 * during development (no macOS/Arc environment was available) — see the
 * "Remaining limitations" section of the implementation report.
 */
export function createArcFamilyAdapter(appName: "Arc" | "Dia"): MeetingUrlSource {
  return {
    usesClipboardFallback: false,
    async getCandidateUrls() {
      const rawCandidates = await runCandidateScript(getArcFamilyTabsScript(appName));
      const scriptableUrls = rawCandidates.filter((candidate) => candidate !== UNSCRIPTABLE_WINDOW_MARKER);

      if (scriptableUrls.length > 0) {
        return scriptableUrls;
      }

      const hadUnscriptableWindow = rawCandidates.length > scriptableUrls.length;
      if (hadUnscriptableWindow) {
        throw new MeetError("ARC_LITTLE_ARC_UNSUPPORTED");
      }

      // Arc's own dictionary reported zero (or zero readable) windows.
      // Cross-check against System Events, which enumerates real on-screen
      // windows regardless of what Arc's scripting dictionary exposes, to
      // catch a Little Arc window that isn't represented in `windows` at all.
      const systemEventsWindowCount = await getSystemEventsWindowCount(appName);
      if (systemEventsWindowCount > rawCandidates.length) {
        throw new MeetError("ARC_LITTLE_ARC_UNSUPPORTED");
      }

      return [];
    },
  };
}

async function getSystemEventsWindowCount(processName: string): Promise<number> {
  const raw = await runAppleScriptSafe(getSystemEventsWindowCountScript(processName)).catch(() => "0");
  const parsed = Number.parseInt(raw, 10);
  return Number.isNaN(parsed) ? 0 : parsed;
}

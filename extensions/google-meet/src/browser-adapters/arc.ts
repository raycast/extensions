import { MeetError } from "../errors";
import { runAppleScriptSafe, runCandidateScript } from "../utils/apple-script";
import { getArcFamilyTabsScript, getSystemEventsWindowCountScript, UNSCRIPTABLE_WINDOW_MARKER } from "../utils/scripts";
import type { MeetingUrlSource } from "./types";

/**
 * Arc and Dia (both built by The Browser Company) share the same nested
 * `tell window i` scripting quirk, and both routinely fail to report the
 * active tab of a window that is otherwise perfectly normal — `URL of active
 * tab` raises `-1728` while a tab is opening, and for windows whose active
 * tab isn't a web page. Arc also enumerates one `window` per space, and those
 * entries mirror each other, so a single blip can mark *every* window at once.
 *
 * An unreadable window is therefore recorded, never thrown on: the poll loop
 * that drives this adapter succeeds on a later tick in the overwhelming
 * majority of cases. Only once polling has actually given up is the state
 * reinterpreted as Arc's "Air Traffic Control" having routed the meeting into
 * a Little Arc window, which either isn't enumerated by Arc's own `windows`
 * list at all or errors when its `active tab` is queried.
 */
export function createArcFamilyAdapter(appName: "Arc" | "Dia"): MeetingUrlSource {
  // Evidence accumulated across every poll, used only to explain an expired
  // deadline. Judging by a single poll — even the last one — would resurrect
  // the false positive this adapter exists to avoid: an ordinary window
  // returns no URL on one sample and a URL on the next, so a blip that
  // happens to land on the poll crossing the deadline proves nothing.
  let lastWindowCount = 0;
  let sawWindow = false;
  let readAnyUrl = false;

  return {
    usesClipboardFallback: false,

    async getCandidateUrls() {
      const rawCandidates = await runCandidateScript(getArcFamilyTabsScript(appName));
      const scriptableUrls = rawCandidates.filter((candidate) => candidate !== UNSCRIPTABLE_WINDOW_MARKER);

      lastWindowCount = rawCandidates.length;
      sawWindow = sawWindow || rawCandidates.length > 0;
      readAnyUrl = readAnyUrl || scriptableUrls.length > 0;

      return scriptableUrls;
    },

    async describeTimeout() {
      // Arc reported windows for the entire detection window and not one
      // poll ever read a URL from any of them. That's a window type which
      // can't be scripted at all, not an ordinary window's transient
      // unreadability, which any of the other polls would have seen through.
      if (sawWindow && !readAnyUrl) {
        return new MeetError("ARC_LITTLE_ARC_UNSUPPORTED");
      }

      // Otherwise cross-check against System Events, which enumerates real
      // on-screen windows regardless of what Arc's scripting dictionary
      // exposes, to catch a Little Arc window missing from `windows` entirely.
      const systemEventsWindowCount = await getSystemEventsWindowCount(appName);
      if (systemEventsWindowCount > lastWindowCount) {
        return new MeetError("ARC_LITTLE_ARC_UNSUPPORTED");
      }

      return undefined;
    },
  };
}

async function getSystemEventsWindowCount(processName: string): Promise<number> {
  const raw = await runAppleScriptSafe(getSystemEventsWindowCountScript(processName)).catch(() => "0");
  const parsed = Number.parseInt(raw, 10);
  return Number.isNaN(parsed) ? 0 : parsed;
}

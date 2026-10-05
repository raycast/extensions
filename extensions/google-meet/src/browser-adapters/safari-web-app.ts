import type { Application } from "@raycast/api";
import { isMeetError, MeetError } from "../errors";
import { CANDIDATE_DELIMITER, runAppleScriptSafe } from "../utils/apple-script";
import { extractMeetingUrlsFromText } from "../utils/meeting-url";
import { getWindowTitlesScript } from "../utils/scripts";
import type { MeetingUrlSource } from "./types";

// Bundle identifiers are interpolated into AppleScript, so anything outside
// the characters a real identifier can contain is rejected up front.
const BUNDLE_ID_PATTERN = /^[A-Za-z0-9.-]+$/;

export type SafariWebAppSource = MeetingUrlSource & {
  /**
   * Records the meeting links the app is already showing, so a window left
   * open from an earlier call is never mistaken for the new meeting. Must be
   * called before the creation URL is opened.
   */
  recordExistingMeetings(): Promise<void>;
};

/**
 * Reads the meeting link out of a Google Meet Safari web app, so a meeting
 * can be created without involving a browser at all.
 *
 * A Safari web app has no usable scripting dictionary (`URL of document`
 * raises `-1728`) and its window doesn't expose `AXDocument`, but Google Meet
 * titles its page "Meet - <code>" once a meeting exists and the web app's
 * window carries that title. Window titles are read through System Events,
 * which needs Raycast to have Accessibility permission.
 */
export function createSafariWebAppSource(app: Application): SafariWebAppSource {
  const bundleId = app.bundleId;
  if (!bundleId || !BUNDLE_ID_PATTERN.test(bundleId)) {
    throw new MeetError("APP_NOT_FOUND", { message: `Couldn't identify ${app.name}.` });
  }

  const windowTitlesScript = getWindowTitlesScript(bundleId);
  const existingMeetingUrls = new Set<string>();
  // Evidence gathered while polling, used only to explain an expired deadline.
  let sawWindow = false;

  async function readWindowTitles(): Promise<string[]> {
    try {
      const output = await runAppleScriptSafe(windowTitlesScript);
      return output.split(CANDIDATE_DELIMITER).filter((title) => title.trim().length > 0);
    } catch (error) {
      if (isMeetError(error) && error.code === "URL_READ_PERMISSION_DENIED") {
        throw new MeetError("URL_READ_PERMISSION_DENIED", {
          message: `Raycast can't read ${app.name}'s window title.`,
          recovery:
            "Grant Raycast Accessibility permission in System Settings → Privacy & Security → Accessibility, and allow it to control System Events under Automation.",
          cause: error,
        });
      }

      // Anything else (e.g. the app still launching) is transient; the next
      // poll gets another chance.
      console.error("[google-meet] Reading web app window titles failed:", error);
      return [];
    }
  }

  return {
    usesClipboardFallback: false,

    async recordExistingMeetings() {
      const titles = await readWindowTitles();
      for (const url of titles.flatMap(extractMeetingUrlsFromText)) {
        existingMeetingUrls.add(url);
      }
    },

    async getCandidateUrls() {
      const titles = await readWindowTitles();
      sawWindow = sawWindow || titles.length > 0;
      return titles.flatMap(extractMeetingUrlsFromText).filter((url) => !existingMeetingUrls.has(url));
    },

    async describeTimeout() {
      if (!sawWindow) {
        return new MeetError("MEETING_URL_TIMEOUT", {
          message: `${app.name} didn't open a window in time.`,
        });
      }

      return new MeetError("MEETING_URL_TIMEOUT", {
        message: `${app.name} never showed a meeting code.`,
        recovery: `Make sure you're signed in to Google in ${app.name}, then try again or increase the detection timeout.`,
      });
    },
  };
}

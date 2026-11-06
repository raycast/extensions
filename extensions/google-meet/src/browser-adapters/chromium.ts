import type { Application } from "@raycast/api";
import { randomUUID } from "crypto";
import { isMeetError, MeetError } from "../errors";
import { runAppleScriptSafe } from "../utils/apple-script";
import {
  BROWSER_NOT_RUNNING_MARKER,
  BUNDLE_ID_PATTERN,
  getChromiumTabUrlScript,
  getOpenChromiumTabScript,
} from "../utils/scripts";
import type { MeetingUrlSource } from "./types";

export function createChromiumAdapter(application: Application): MeetingUrlSource {
  const { bundleId } = application;
  if (!bundleId || !BUNDLE_ID_PATTERN.test(bundleId)) {
    throw new MeetError("APP_NOT_FOUND", { message: `Couldn't identify ${application.name}.` });
  }

  let tabId: string | undefined;

  return {
    usesClipboardFallback: false,
    async openCreationUrl(url) {
      try {
        const createdTabId = await runAppleScriptSafe(
          getOpenChromiumTabScript(bundleId, `about:blank#raycast-google-meet-${randomUUID()}`, url),
        );
        if (!/^\d+$/.test(createdTabId)) throw new Error(`Unexpected tab id "${createdTabId}"`);
        tabId = createdTabId;
      } catch (error) {
        if (isMeetError(error) && error.code === "URL_READ_PERMISSION_DENIED") throw error;
        throw new MeetError("APP_LAUNCH_FAILED", {
          cause: error,
          message: `Couldn't open a tab in ${application.name}.`,
        });
      }
    },
    async getCandidateUrls() {
      if (!tabId) return [];
      const url = await runAppleScriptSafe(getChromiumTabUrlScript(bundleId, tabId));
      if (url === BROWSER_NOT_RUNNING_MARKER) {
        throw new MeetError("URL_READ_FAILED", {
          message: `${application.name} quit before the meeting link appeared.`,
          recovery: "Try again.",
        });
      }
      return url ? [url] : [];
    },
  };
}

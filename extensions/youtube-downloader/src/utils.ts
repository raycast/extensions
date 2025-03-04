import { getPreferenceValues } from "@raycast/api";
import { runAppleScript } from "@raycast/utils";
import { formatDuration, intervalToDuration } from "date-fns";
import isUrlSuperb from "is-url-superb";
import { GET_ACTIVE_APP_SCRIPT, GET_LINK_FROM_BROWSER_SCRIPT, SUPPORTED_BROWSERS } from "./browser.js";

export const preferences = getPreferenceValues<ExtensionPreferences>();

export type DownloadOptions = {
  url: string;
  format: string;
  copyToClipboard: boolean;
  startTime?: string;
  endTime?: string;
};

export function formatHHMM(seconds: number) {
  const duration = intervalToDuration({ start: 0, end: seconds * 1000 });

  return formatDuration(duration, {
    format: duration.hours && duration.hours > 0 ? ["hours", "minutes", "seconds"] : ["minutes", "seconds"],
    zero: true,
    delimiter: ":",
    locale: {
      formatDistance: (_token, count) => String(count).padStart(2, "0"),
    },
  });
}

export function parseHHMM(input: string) {
  const parts = input.split(":");
  if (parts.length === 2) {
    const [minutes, seconds] = parts;
    return parseInt(minutes) * 60 + parseInt(seconds);
  } else if (parts.length === 3) {
    const [hours, minutes, seconds] = parts;
    return parseInt(hours) * 60 * 60 + parseInt(minutes) * 60 + parseInt(seconds);
  }
  throw new Error("Invalid input");
}

export function isValidHHMM(input: string) {
  try {
    if (input) {
      parseHHMM(input);
    }
    return true;
  } catch {
    return false;
  }
}

export function isValidUrl(url: string) {
  return isUrlSuperb(url, { lenient: true });
}

export async function getActiveBrowserURL() {
  try {
    const activeApp = await runAppleScript(GET_ACTIVE_APP_SCRIPT);
    if (SUPPORTED_BROWSERS.includes(activeApp)) {
      const linkInfoStr = await runAppleScript(GET_LINK_FROM_BROWSER_SCRIPT(activeApp));
      const [url] = linkInfoStr.split("\t"); // [url, title]
      return url;
    }
    return "";
  } catch (error) {
    console.log("Failed to get active browser URL");
    return "";
  }
}

import { getPreferenceValues } from "@raycast/api";
import { formatDuration, intervalToDuration } from "date-fns";

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

export function isYouTubeURL(input: string) {
  const validHostnames = new Set(["youtube.com", "www.youtube.com", "youtu.be"]);
  const videoIdPattern = /^[a-zA-Z0-9_-]{11}$/;
  const linkProtocolPrefix = "https://";
  if (!input.startsWith(linkProtocolPrefix)) input = linkProtocolPrefix + input;
  try {
    const url = new URL(input);
    if (!validHostnames.has(url.hostname)) return false;

    if (url.hostname === "youtu.be") {
      return videoIdPattern.test(url.pathname.slice(1));
    }

    if (url.pathname.startsWith("/embed/")) {
      return videoIdPattern.test(url.pathname.slice(7));
    }

    const videoId = url.searchParams.get("v");
    return videoId ? videoIdPattern.test(videoId) : false;
  } catch {
    return false;
  }
}

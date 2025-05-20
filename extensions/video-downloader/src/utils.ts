import { getApplications, getPreferenceValues, Icon } from "@raycast/api";
import type { Image } from "@raycast/api";
import { formatDuration, intervalToDuration } from "date-fns";
import isUrlSuperb from "is-url-superb";
import { Browser, Format, Video } from "./types.js";
import fs from "node:fs";
import path from "node:path";

export const {
  downloadPath,
  homebrewPath,
  ytdlPath,
  ffmpegPath,
  ffprobePath,
  autoLoadUrlFromClipboard,
  autoLoadUrlFromSelectedText,
  enableBrowserExtensionSupport,
  forceIpv4,
} = getPreferenceValues<ExtensionPreferences>();

export type DownloadOptions = {
  url: string;
  format: string;
  copyToClipboard: boolean;
  startTime?: string;
  endTime?: string;
  browser?: string;
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

export function formatTbr(tbr: number | null) {
  if (!tbr) return "";
  return `${Math.floor(tbr)} kbps`;
}

export function formatFilesize(filesize?: number, filesizeApprox?: number) {
  const size = filesize || filesizeApprox;
  if (!size) return "";

  if (size < 1024) {
    return `${size} B`;
  }
  if (size < 1024 ** 2) {
    return `${(size / 1024).toFixed(2)} KiB`;
  }
  if (size < 1024 ** 3) {
    return `${(size / 1024 ** 2).toFixed(2)} MiB`;
  }
  return `${(size / 1024 ** 3).toFixed(2)} GiB`;
}

const hasCodec = ({ vcodec, acodec }: Format) => {
  return {
    hasVcodec: Boolean(vcodec) && vcodec !== "none",
    hasAcodec: Boolean(acodec) && acodec !== "none",
  };
};

export const getFormats = (video?: Video) => {
  const videoKey = "Video";
  const audioOnlyKey = "Audio Only";
  const videoWithAudio: Format[] = [];
  const audioOnly: Format[] = [];

  if (!video) return { [videoKey]: videoWithAudio, [audioOnlyKey]: audioOnly };

  for (const format of video.formats.slice().reverse()) {
    const { hasAcodec, hasVcodec } = hasCodec(format);
    if (hasVcodec) videoWithAudio.push(format);
    else if (hasAcodec && !hasVcodec) audioOnly.push(format);
    else continue;
  }

  return { [videoKey]: videoWithAudio, [audioOnlyKey]: audioOnly };
};

export const getFormatValue = (format: Format) => {
  const { hasAcodec } = hasCodec(format);
  const audio = hasAcodec ? "" : "+bestaudio";
  const targetExt = `#${format.ext}`;
  return format.format_id + audio + targetExt;
};

export const getFormatTitle = (format: Format) =>
  [format.resolution, format.ext, formatTbr(format.tbr), formatFilesize(format.filesize)]
    .filter((x) => Boolean(x))
    .join(" | ");

async function getApplicationIcon(appPath: string): Promise<Image | undefined> {
  try {
    const resourcesPath = path.join(appPath, "Contents", "Resources");
    const files = await fs.promises.readdir(resourcesPath);
    const icnsFile = files.find((file) => file.endsWith(".icns"));
    if (icnsFile) return { source: path.join(resourcesPath, icnsFile) };
    return undefined;
  } catch (e) {
    return undefined;
  }
}

const SUPPORTED_BROWSERS_MAP: Map<string, string> = new Map([
  ["com.brave.browser", "brave"],
  ["com.google.chrome", "chrome"],
  ["org.chromium.chromium", "chromium"],
  ["com.microsoft.edgemac", "edge"],
  ["com.operasoftware.opera", "opera"],
  ["com.vivaldi.vivaldi", "vivaldi"],
  ["com.naver.whale", "whale"],
  ["org.mozilla.firefox", "firefox"],
  ["com.apple.safari", "safari"],
]);

const SUPPORTED_BROWSER_BUNDLE_IDS = new Set(SUPPORTED_BROWSERS_MAP.keys());

export const getSupportedBrowsersForImportingCookies = async (): Promise<Browser[]> => {
  const apps = await getApplications("https://www.youtube.com");
  const supportedApps = apps.filter(
    (app) => app.bundleId && SUPPORTED_BROWSER_BUNDLE_IDS.has(app.bundleId.toLowerCase()),
  );
  const browsers = await Promise.all(
    supportedApps.map(async (app) => ({
      ...app,
      iconPath: (await getApplicationIcon(app.path)) ?? Icon.Compass,
      ytDlpCompatibleName: SUPPORTED_BROWSERS_MAP.get(app.bundleId?.toLowerCase() ?? "") ?? app.name,
    })),
  );
  return browsers;
};

export const getReadableErrorTitle = (error: Error) => {
  const msg = error.message;
  const errorIndex = msg.indexOf("ERROR:");
  let err = errorIndex !== -1 ? msg.slice(errorIndex + "ERROR:".length).trim() : msg;
  // remove any Error codes
  err = err.replace(/\[.+\]/g, "");
  // remove any quoted paths
  err = err.replace(/'[^']*'|"[^"]*"/g, "...");
  // remove any absolute paths
  err = err.replace(/\/\S+/g, "...");
  // remove any trailing references
  err = err.replace(/(in|at)?:? (...)?$/, "");
  return err.charAt(0).toUpperCase() + err.slice(1);
};

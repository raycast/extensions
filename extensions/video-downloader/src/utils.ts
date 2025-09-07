import { getPreferenceValues, showToast, Toast } from "@raycast/api";
import { formatDuration, intervalToDuration } from "date-fns";
import isUrlSuperb from "is-url-superb";
import { Format, Video } from "./types.js";
import { existsSync } from "fs";
import { execa } from "execa";
import { execSync } from "child_process";

export const isWindows = process.platform === "win32";
export const isMac = process.platform === "darwin";

export const {
  downloadPath,
  homebrewPath,
  autoLoadUrlFromClipboard,
  autoLoadUrlFromSelectedText,
  enableBrowserExtensionSupport,
  forceIpv4,
  ytdlPath: ytdlPathPreference,
  ffmpegPath: ffmpegPathPreference,
  ffprobePath: ffprobePathPreference,
} = getPreferenceValues<ExtensionPreferences>();

export async function getWingetPath() {
  const defaultPath = (await execa("where winget")).stdout.trim().split("\n")[0];

  if (!existsSync(defaultPath)) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Winget path not found",
      message: "Please set the correct path in preferences.",
    });
  }

  return defaultPath;
}

export const getytdlPath = () => {
  if (ytdlPathPreference && existsSync(ytdlPathPreference)) return ytdlPathPreference;

  try {
    const defaultPath = isMac
      ? "/opt/homebrew/bin/yt-dlp"
      : isWindows
        ? execSync("where yt-dlp").toString().trim().split("\n")[0]
        : "/usr/bin/yt-dlp";

    return defaultPath;
  } catch (error) {
    return "";
  }
};

export const getffmpegPath = () => {
  if (ffmpegPathPreference && existsSync(ffmpegPathPreference)) return ffmpegPathPreference;

  try {
    const defaultPath = isMac
      ? "/opt/homebrew/bin/ffmpeg"
      : isWindows
        ? execSync("where ffmpeg").toString().trim().split("\n")[0]
        : "/usr/bin/ffmpeg";

    return defaultPath;
  } catch (error) {
    return "";
  }
};

export const getffprobePath = () => {
  if (ffprobePathPreference && existsSync(ffprobePathPreference)) return ffprobePathPreference;

  try {
    const defaultPath = isMac
      ? "/opt/homebrew/bin/ffprobe"
      : isWindows
        ? execSync("where ffprobe").toString().trim().split("\n")[0]
        : "/usr/bin/ffprobe";
    return defaultPath;
  } catch (error) {
    return "";
  }
};

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

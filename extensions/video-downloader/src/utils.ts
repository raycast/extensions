import fs from "node:fs/promises";
import { getPreferenceValues } from "@raycast/api";
import { formatDuration, intervalToDuration } from "date-fns";
import isUrlSuperb from "is-url-superb";
import { Category, Format, Video } from "./types.js";

export const preferences = getPreferenceValues<ExtensionPreferences>();

export const checkExecutables = async (): Promise<[string, boolean][]> => {
  const { homebrewPath, ytdlPath, ffmpegPath, ffprobePath } = preferences;
  return Promise.all(
    Object.entries({ homebrew: homebrewPath, "yt-dlp": ytdlPath, ffmpeg: ffmpegPath, ffprobe: ffprobePath }).map(
      async ([app, path]) =>
        fs
          .access(path, fs.constants.R_OK)
          .then(() => [app, true] as [string, boolean])
          .catch(() => [app, false] as [string, boolean]),
    ),
  );
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

export const getFormats = (video?: Video, advanced?: boolean) => {
  const videoWithAudio: Format[] = [];
  const audioOnly: Format[] = [];

  if (!video) return { [Category.Video]: videoWithAudio, [Category.AudioOnly]: audioOnly };

  for (const format of video.formats.slice().reverse()) {
    const { hasAcodec, hasVcodec } = hasCodec(format);
    const hasFilesize = format.filesize || format.filesize_approx;
    if (hasVcodec) {
      if (!advanced && (!hasFilesize || videoWithAudio.find((f) => f.resolution === format.resolution))) continue;
      videoWithAudio.push(format);
    } else if (hasAcodec && !hasVcodec) {
      if (!advanced && (!hasFilesize || audioOnly.find((f) => f.tbr === format.tbr))) continue;
      audioOnly.push(format);
    } else continue;
  }

  return { [Category.Video]: videoWithAudio, [Category.AudioOnly]: audioOnly };
};

export const getFormatValue = (format: Format, category: string, advanced: boolean) => {
  const { hasAcodec } = hasCodec(format);
  const audio = hasAcodec ? "" : "+bestaudio";
  const targetExt = advanced ? `#${format.ext}` : category === Category.AudioOnly ? "#m4a" : "#mp4";
  return format.format_id + audio + targetExt;
};

export const getFormatTitle = (format: Format, category: string, advanced: boolean) =>
  [
    category === Category.AudioOnly ? "" : format.resolution,
    advanced ? format.ext : "",
    advanced || category === Category.AudioOnly ? formatTbr(format.tbr) : "",
    formatFilesize(format.filesize),
  ]
    .filter((x) => Boolean(x))
    .join(" | ");

export const secondsToTimestamp = (total: number) => {
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  const timestamp = [hours, minutes, seconds]
    .filter((x, i) => (x === 0 && i === 0 ? false : true))
    .map((x) => String(x).padStart(2, "0"))
    .join(":");
  return timestamp;
};

export const timestampToSeconds = (timestamp: string) => {
  const [s = "0", m = "0", h = "0"] = timestamp.split(":").toReversed();
  return parseInt(s, 10) + parseInt(m, 10) * 60 + parseInt(h, 10) * 3600;
};

export const isValidClipstamp = (clipRange?: string) => {
  if (!clipRange) return true;
  const [from, to] = clipRange.split("-");
  const timestampPattern = /^(?:\d+:){0,2}\d+$/;
  return timestampPattern.test(from) && timestampPattern.test(to);
};

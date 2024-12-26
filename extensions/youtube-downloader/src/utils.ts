import ytdl from "@distube/ytdl-core";
import { Clipboard, getPreferenceValues, open, showHUD, Toast } from "@raycast/api";
import { intervalToDuration, formatDuration } from "date-fns";
import tempfile from "tempfile";
import { unusedFilenameSync } from "unused-filename";
import path from "path";
import fs from "fs";
import ffmpeg, { setFfmpegPath, setFfprobePath } from "fluent-ffmpeg";
import { promisify } from "util";
import stream from "stream";
import sanitizeFilename from "sanitize-filename";

const pipeline = promisify(stream.pipeline);

export const preferences = getPreferenceValues<{
  downloadPath: string;
  ffmpegPath: string;
  ffprobePath: string;
}>();

export type DownloadOptions = {
  url: string;
  format: string;
  copyToClipboard: boolean;
  startTime?: string;
  endTime?: string;
};

export type FormatOptions = {
  itag: string;
  container: string;
  wav?: boolean;
};

setFfmpegPath(preferences.ffmpegPath);
setFfprobePath(preferences.ffprobePath);

export async function downloadVideo(url: string, options: DownloadOptions) {
  const formatObject: FormatOptions = JSON.parse(options.format);
  const info = await ytdl.getInfo(url);

  const toast = new Toast({
    title: "Downloading Video",
    message: "0%",
    style: Toast.Style.Animated,
  });

  toast.show();

  const container = formatObject.container || "mp4";
  const title = info.videoDetails.title;
  let filePath = "";

  if (options.copyToClipboard) {
    const tempfilePath = tempfile();
    filePath = path.join(
      tempfilePath.substring(0, tempfilePath.lastIndexOf("/")),
      `${sanitizeFilename(title)}.${container}`
    );
  } else {
    filePath = unusedFilenameSync(path.join(preferences.downloadPath, `${sanitizeFilename(title)}.${container}`));
  }

  const videoFormat = ytdl.chooseFormat(info.formats, {
    quality: "highest",
    filter: (format) =>
      format.container === container && format.hasVideo && format.itag.toString() === formatObject.itag,
  });
  const audioFormat = ytdl.chooseFormat(info.formats, {
    quality: "highestaudio",
    filter: (format) => format.container === container && !format.hasVideo && format.hasAudio,
  });

  if (!videoFormat || !audioFormat) {
    console.error("Unable to find suitable video or audio format.");
    return;
  }

  const videoTempFile = tempfile(`.${container}`);
  const audioTempFile = tempfile(`.${container}`);

  let videoDownloaded = 0;
  let audioDownloaded = 0;

  try {
    await Promise.all([
      pipeline(
        ytdl.downloadFromInfo(info, { format: videoFormat }).on("progress", (chunk, downloaded, total) => {
          videoDownloaded = downloaded / total;
          const progress = videoDownloaded + audioDownloaded;
          toast.message = `${Math.round((progress / 2) * 100)}%`;
        }),
        fs.createWriteStream(videoTempFile)
      ),
      pipeline(
        ytdl.downloadFromInfo(info, { format: audioFormat }).on("progress", (chunk, downloaded, total) => {
          audioDownloaded = downloaded / total;
          const progress = videoDownloaded + audioDownloaded;
          toast.message = `${Math.round((progress / 2) * 100)}%`;
        }),
        fs.createWriteStream(audioTempFile)
      ),
    ]);
  } catch (err) {
    toast.title = "Download Failed";
    toast.style = Toast.Style.Failure;

    const error = err as Error;
    if (error.message.includes("private video")) {
      toast.message = "This video is private and cannot be downloaded.";
    } else if (error.message.includes("429")) {
      toast.message = "You have exceeded your download quota.";
    } else {
      toast.message = "Please try again later.";
    }
    return;
  }

  return new Promise((resolve) => {
    const command = ffmpeg();

    if (options.startTime) {
      command.input(videoTempFile).seekInput(options.startTime).input(audioTempFile).seekInput(options.startTime);
    } else {
      command.input(videoTempFile).input(audioTempFile);
    }

    if (options.endTime) {
      const startTime = parseHHMM(options.startTime || "0:00");
      const endTime = parseHHMM(options.endTime);
      command.duration(endTime - startTime);
    }

    command
      .videoCodec("copy")
      .audioCodec("copy")
      .format(container)
      .outputOptions("-strict", "-2")
      .save(filePath)
      .on("error", (err) => {
        toast.title = "Encoding Failed";
        toast.message = err.message;
        toast.style = Toast.Style.Failure;
        console.error(err);
      })
      .on("end", () => {
        fs.unlinkSync(videoTempFile);
        fs.unlinkSync(audioTempFile);

        resolve(null);

        if (options.copyToClipboard) {
          Clipboard.copy({ file: filePath });
          toast.title = "Copied to Clipboard";
          toast.message = title;
          toast.style = Toast.Style.Success;
        } else {
          toast.title = "Download Complete";
          toast.message = title;
          toast.style = Toast.Style.Success;
          toast.primaryAction = {
            title: "Open in Finder",
            shortcut: { modifiers: ["cmd", "shift"], key: "o" },
            onAction: () => {
              open(path.dirname(filePath));
            },
          };
          toast.secondaryAction = {
            title: "Copy to Clipboard",
            shortcut: { modifiers: ["cmd", "shift"], key: "c" },
            onAction: () => {
              Clipboard.copy({ file: filePath });
              showHUD("Copied to Clipboard");
            },
          };
        }
      });
  });
}

export async function downloadAudio(url: string, options: DownloadOptions) {
  const formatObject: FormatOptions = JSON.parse(options.format);
  const info = await ytdl.getInfo(url);

  const toast = new Toast({
    title: "Downloading Audio",
    message: "0%",
    style: Toast.Style.Animated,
  });

  toast.show();

  const title = info.videoDetails.title;

  const videoTempFile = tempfile(".mp4");

  try {
    await pipeline(
      ytdl
        .downloadFromInfo(info, { filter: (format) => format.itag.toString() === formatObject.itag })
        .on("progress", (chunk, downloaded, total) => {
          const progress = downloaded / total;
          toast.message = `${Math.round(progress * 100)}%`;
        }),
      fs.createWriteStream(videoTempFile)
    );
  } catch (err) {
    toast.title = "Download Failed";
    toast.style = Toast.Style.Failure;

    const error = err as Error;
    if (error.message.includes("private video")) {
      toast.message = "This video is private and cannot be downloaded.";
    } else if (error.message.includes("429")) {
      toast.message = "You have exceeded your download quota.";
    } else {
      toast.message = "Please try again later.";
    }
    return;
  }

  let filePath = "";

  if (options.copyToClipboard) {
    const tempfilePath = tempfile();
    filePath = path.join(
      tempfilePath.substring(0, tempfilePath.lastIndexOf("/")),
      `${sanitizeFilename(title)}${formatObject.wav ? ".wav" : ".mp3"}`
    );
  } else {
    filePath = unusedFilenameSync(
      path.join(preferences.downloadPath, `${sanitizeFilename(title)}${formatObject.wav ? ".wav" : ".mp3"}`)
    );
  }

  return new Promise((resolve) => {
    const command = ffmpeg();

    if (options.startTime) {
      command.input(videoTempFile).seekInput(options.startTime);
    } else {
      command.input(videoTempFile);
    }

    if (options.endTime) {
      const startTime = parseHHMM(options.startTime || "0:00");
      const endTime = parseHHMM(options.endTime);
      command.duration(endTime - startTime);
    }

    if (formatObject.wav) {
      command.audioCodec("pcm_s16le").format("wav");
    } else {
      command.format("mp3");
    }

    command
      .save(filePath)
      .on("error", (err) => {
        toast.title = "Encoding Failed";
        toast.message = err.message;
        toast.style = Toast.Style.Failure;
      })
      .on("end", () => {
        fs.unlinkSync(videoTempFile);

        resolve(null);

        if (options.copyToClipboard) {
          Clipboard.copy({ file: filePath });
          toast.title = "Copied to Clipboard";
          toast.message = title;
          toast.style = Toast.Style.Success;
        } else {
          toast.title = "Download Complete";
          toast.message = title;
          toast.style = Toast.Style.Success;
          toast.primaryAction = {
            title: "Open in Finder",
            shortcut: { modifiers: ["cmd", "shift"], key: "o" },
            onAction: () => {
              open(path.dirname(filePath));
            },
          };
          toast.secondaryAction = {
            title: "Copy to Clipboard",
            shortcut: { modifiers: ["cmd", "shift"], key: "c" },
            onAction: () => {
              Clipboard.copy({ file: filePath });
              showHUD("Copied to Clipboard");
            },
          };
        }
      });
  });
}

export function formatHHMM(seconds: number) {
  const duration = intervalToDuration({ start: 0, end: seconds * 1000 });
  return formatDuration(duration, {
    format: ["minutes", "seconds"],
    // format: ["hours", "minutes", "seconds"],
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

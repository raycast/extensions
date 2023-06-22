import ytdl from "ytdl-core";
import { Clipboard, getPreferenceValues, open, showHUD, Toast } from "@raycast/api";
import tempfile from "tempfile";
import { unusedFilenameSync } from "unused-filename";
import path from "path";
import fs from "fs";
import ffmpeg, { setFfmpegPath, setFfprobePath } from "fluent-ffmpeg";
import { promisify } from "util";
import stream from "stream";

const pipeline = promisify(stream.pipeline);

const preferences = getPreferenceValues();

setFfprobePath("/opt/homebrew/bin/ffprobe");
setFfmpegPath("/opt/homebrew/bin/ffmpeg");

export async function downloadVideo(url: string, options: { format: string; copyToClipboard: boolean }) {
  const info = await ytdl.getInfo(url);

  const toast = new Toast({
    title: "Downloading Video",
    message: "0%",
    style: Toast.Style.Animated,
  });

  toast.show();

  const title = info.videoDetails.title;
  const filePath = options.copyToClipboard
    ? tempfile(".mp4")
    : unusedFilenameSync(path.join(preferences.downloadPath, `${title}.mp4`));

  const videoFormat = ytdl.chooseFormat(info.formats, {
    quality: "highestvideo",
    filter: (format) => format.container === "mp4" && format.hasVideo && format.itag.toString() === options.format,
  });
  const audioFormat = ytdl.chooseFormat(info.formats, {
    quality: "highestaudio",
    filter: (format) => format.container === "mp4" && !format.hasVideo && format.hasAudio,
  });

  if (!videoFormat || !audioFormat) {
    console.error("Unable to find suitable video or audio format.");
    return;
  }

  const videoTempFile = tempfile(".mp4");
  const audioTempFile = tempfile(".mp4");

  let videoDownloaded = 0;
  let audioDownloaded = 0;

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

  return new Promise((resolve) => {
    ffmpeg()
      .input(videoTempFile)
      .input(audioTempFile)
      .videoCodec("copy")
      .audioCodec("copy")
      .format("mp4")
      .outputOptions("-strict", "-2")
      .save(filePath)
      .on("error", (err) => {
        toast.title = "Download Failed";
        toast.message = err.message;
        toast.style = Toast.Style.Failure;
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

export async function downloadAudio(url: string, options: { format: string; copyToClipboard: boolean }) {
  const info = await ytdl.getInfo(url);

  const toast = new Toast({
    title: "Downloading Audio",
    message: "0%",
    style: Toast.Style.Animated,
  });

  toast.show();

  const title = info.videoDetails.title;
  const filePath = options.copyToClipboard
    ? tempfile(".mp4")
    : unusedFilenameSync(path.join(preferences.downloadPath, `${title}.mp4`));

  return new Promise((resolve) => {
    ytdl
      .downloadFromInfo(info, { filter: (format) => format.itag.toString() === options.format })
      .on("progress", (chunk, downloaded, total) => {
        const progress = downloaded / total;
        toast.message = `${Math.round(progress * 100)}%`;
      })
      .on("error", (err) => {
        toast.title = "Download Failed";
        toast.message = err.message;
        toast.style = Toast.Style.Failure;
      })
      .on("end", () => {
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
      })
      .pipe(fs.createWriteStream(filePath));
  });
}

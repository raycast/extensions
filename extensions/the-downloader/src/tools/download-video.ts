import {
  getFormatValue,
  getVideoFormats,
  downloadPath,
  forceIpv4,
  getIdleTimeoutMs,
  getytdlPath,
  getffmpegPath,
  getffprobePath,
  getDenoPath,
  sanitizeVideoTitle,
} from "../utils.js";
import fs from "node:fs";
import path from "node:path";
import { fetchVideoInfo, isLiveStream } from "../lib/ytdlp.js";
import { runWithWatchdog } from "../lib/run.js";
import { detectSource } from "../lib/detect.js";
import { filetypeGuidance } from "../lib/filetype.js";

type Input = {
  /**
   * The URL of the video to download.
   */
  url: string;
};

export default async function tool(input: Input) {
  // This tool only does video (yt-dlp). Pointing it at an image gallery, a
  // Spotify link, or an arbitrary page would otherwise hand the URL to yt-dlp
  // and fail with a raw "No video formats found" dump. Bail early with the same
  // guidance the Download command shows, and route the user to the right tool.
  const source = detectSource(input.url);
  if (source !== "video") {
    throw new Error(`${filetypeGuidance(source)} Use the “Download” command to fetch this URL.`);
  }

  const ytdlPath = getytdlPath();
  const ffmpegPath = getffmpegPath();
  const ffprobePath = getffprobePath();
  const denoPath = getDenoPath();
  const deno = fs.existsSync(denoPath) ? denoPath : undefined;

  // Validate executables exist
  if (!fs.existsSync(ytdlPath)) {
    throw new Error("yt-dlp is not installed");
  }
  if (!fs.existsSync(ffmpegPath)) {
    throw new Error("ffmpeg is not installed");
  }
  if (!fs.existsSync(ffprobePath)) {
    throw new Error("ffprobe is not installed");
  }

  // Get video info and available formats. Cap the metadata fetch so a wedged
  // extractor can't hang the agent turn indefinitely.
  const video = await fetchVideoInfo(ytdlPath, input.url, forceIpv4, deno, { timeoutMs: getIdleTimeoutMs() });

  // Check if it's a live stream
  if (isLiveStream(video)) {
    throw new Error("Live streams are not supported");
  }

  // Set up download options. `--no-playlist` keeps the download phase in
  // lock-step with fetchVideoInfo, which is also called with --no-playlist
  // (see src/lib/ytdlp.ts): without it, pasting a playlist URL would dump
  // every video in the playlist into the user's download folder, even
  // though our live-stream and format checks only inspected the first one.
  const options: string[] = ["-P", downloadPath, "--no-playlist"];
  if (deno) options.push("--js-runtimes", `deno:${deno}`);

  // Get the best video+audio format
  const bestFormat = getVideoFormats(video)[0]; // Best-first, so the first entry is best quality
  if (bestFormat) {
    const formatValue = getFormatValue(bestFormat);
    const [downloadFormat, container] = formatValue.split("#");
    options.push("--ffmpeg-location", ffmpegPath);
    options.push("--format", downloadFormat);
    // Remux into the container (lossless stream copy) rather than --recode-video,
    // which forces a slow full re-encode. Mirrors buildVideoDownloadArgs.
    options.push("--merge-output-format", container);
  }

  // Sentinel-tag the after_move filepath so it can be picked out of yt-dlp's
  // mixed stdout deterministically — without it the old `startsWith("/")`
  // filter failed on Windows (paths start with a drive letter, not a slash).
  const FILEPATH_TAG = "THE-DOWNLOADER-FILEPATH:";
  options.push("--print", `after_move:${FILEPATH_TAG}%(filepath)s`);

  // Execute the download through the shared watchdog: stdin is closed so
  // yt-dlp can't block on an interactive auth prompt, and the IDLE timeout
  // kills a stalled child while leaving a healthy long download alone. The
  // previous execa `timeout` here was a TOTAL-runtime cap — it killed every
  // download that simply took longer than the idle window (2 minutes by
  // default), even while bytes were flowing.
  const { code, stdout, stderr } = await runWithWatchdog(ytdlPath, [...options, input.url], {
    idleMs: getIdleTimeoutMs(),
    env: { ...process.env, PYTHONUNBUFFERED: "1" },
  });
  if (code !== 0) {
    throw new Error(`Failed to download video: ${stderr.trim() || `yt-dlp exited with code ${code}`}`);
  }

  const taggedLine = stdout
    .split("\n")
    .map((line) => line.trim())
    .find((line) => line.startsWith(FILEPATH_TAG));
  const filePath = taggedLine?.slice(FILEPATH_TAG.length).trim();

  if (!filePath) {
    throw new Error("Could not determine downloaded file path");
  }

  return {
    downloadedPath: filePath,
    fileName: path.basename(filePath),
    title: sanitizeVideoTitle(video.title),
    duration: video.duration,
  };
}

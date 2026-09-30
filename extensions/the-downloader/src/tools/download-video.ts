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
import { randomUUID } from "node:crypto";
import path from "node:path";
import { fetchVideoInfo, isLiveStream, runVideoDownload } from "../lib/ytdlp.js";
import { getConfig } from "../lib/config.js";
import { composeVideoFormat } from "../lib/video-format.js";
import { detectSource } from "../lib/detect.js";
import { isValidUrl, normalizeUrl } from "../lib/url.js";
import { filetypeGuidance } from "../lib/filetype.js";
import { recordDownload } from "../lib/history.js";

type Input = {
  /**
   * The URL of the video to download.
   */
  url: string;
};

export default async function tool(input: Input) {
  // This tool only does video (yt-dlp). A gallery or a Spotify link would hand
  // yt-dlp a URL it can't use and fail with a raw "No video formats found"
  // dump, so point to the Download command instead. Sites it doesn't recognize
  // are tried, like the Download form's Video option: yt-dlp supports far more
  // than the known list.
  // The model supplies this value, so check it like the commands do: only a
  // real http(s) URL may reach yt-dlp, never something it would read as an
  // option (a prompt-injected "--batch-file=…").
  if (!isValidUrl(input.url)) {
    throw new Error("Invalid URL — provide an http(s) video URL.");
  }
  const url = normalizeUrl(input.url);
  const startedAt = Date.now();
  const source = detectSource(url);
  if (source === "gallery" || source === "spotify") {
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
  const video = await fetchVideoInfo(ytdlPath, url, forceIpv4, deno, { timeoutMs: getIdleTimeoutMs() });

  // Check if it's a live stream
  if (isLiveStream(video)) {
    throw new Error("Live streams are not supported");
  }

  // The best video stream (best-first), plus the best audio when it has none,
  // in its own container — or the saved defaults when the site lists no video
  // formats. The shared runner (like the Download form) keeps `--no-playlist`
  // in step with the metadata fetch, remuxes instead of re-encoding, falls back
  // to mkv when WebM can't hold the streams, and reports the saved file.
  const bestFormat = getVideoFormats(video)[0];
  const config = getConfig();
  const format = bestFormat
    ? getFormatValue(bestFormat)
    : composeVideoFormat({
        mediaType: "video",
        quality: config.videoQuality,
        container: config.videoContainer,
        audioFormat: config.audioFormat,
      });

  let filePath: string;
  try {
    ({ filePath } = await runVideoDownload(
      ytdlPath,
      {
        url,
        format,
        outputTemplate: path.join(downloadPath, "%(title)s (%(id)s).%(ext)s"),
        ffmpegPath,
        denoPath: deno,
        idleMs: getIdleTimeoutMs(),
      },
      () => undefined,
    ));
  } catch (error) {
    throw new Error(`Failed to download video: ${error instanceof Error ? error.message : String(error)}`);
  }

  if (!filePath) {
    throw new Error("Could not determine downloaded file path");
  }

  // Show AI downloads in the Download History too.
  await recordDownload({
    id: randomUUID(),
    url,
    kind: "video",
    status: "done",
    title: sanitizeVideoTitle(video.title),
    uploader: video.uploader ?? video.channel ?? undefined,
    thumbnail: video.thumbnail ?? undefined,
    source: video.extractor_key ?? undefined,
    duration: video.duration || undefined,
    format: bestFormat ? `${bestFormat.resolution} · ${bestFormat.ext.toUpperCase()}` : undefined,
    folder: downloadPath,
    filePath,
    startedAt,
    finishedAt: Date.now(),
  });

  return {
    downloadedPath: filePath,
    fileName: path.basename(filePath),
    title: sanitizeVideoTitle(video.title),
    duration: video.duration,
  };
}

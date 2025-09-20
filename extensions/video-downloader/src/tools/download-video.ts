import { execa } from "execa";
import {
  getFormatValue,
  getFormats,
  downloadPath,
  forceIpv4,
  getytdlPath,
  getffmpegPath,
  getffprobePath,
} from "../utils.js";
import fs from "node:fs";
import path from "node:path";
import { Video } from "../types.js";

type Input = {
  /**
   * The URL of the video to download.
   */
  url: string;
};

export default async function tool(input: Input) {
  const ytdlPath = getytdlPath();
  const ffmpegPath = getffmpegPath();
  const ffprobePath = getffprobePath();

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

  // Get video info and available formats
  const videoInfo = await execa(
    ytdlPath,
    [forceIpv4 ? "--force-ipv4" : "", "--dump-json", "--format-sort=resolution,ext,tbr", input.url].filter((x) =>
      Boolean(x),
    ),
  );

  const video = JSON.parse(videoInfo.stdout) as Video;

  // Check if it's a live stream
  if (video.live_status !== "not_live" && video.live_status !== undefined) {
    throw new Error("Live streams are not supported");
  }

  // Set up download options
  const options: string[] = ["-P", downloadPath];

  // Getet the best video+audio format
  const formats = getFormats(video);
  const bestFormat = formats["Video"][0]; // First format in Video category is best quality
  if (bestFormat) {
    const formatValue = getFormatValue(bestFormat);
    const [downloadFormat, recodeFormat] = formatValue.split("#");
    options.push("--ffmpeg-location", ffmpegPath);
    options.push("--format", downloadFormat);
    options.push("--recode-video", recodeFormat);
  }

  options.push("--print", "after_move:filepath");

  // Execute download
  const result = await execa(ytdlPath, [...options, input.url]);

  if (result.failed) {
    throw new Error(`Failed to download video: ${result.stderr}`);
  }

  // Extract file path from output
  const filePath = result.stdout.split("\n").find((line) => line.startsWith("/"));

  if (!filePath) {
    throw new Error("Could not determine downloaded file path");
  }

  return {
    downloadedPath: filePath,
    fileName: path.basename(filePath),
    title: video.title,
    duration: video.duration,
  };
}

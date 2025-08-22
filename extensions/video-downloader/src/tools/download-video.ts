import path from "node:path";
import { execa } from "execa";
import { getPreferenceValues } from "@raycast/api";
import { checkExecutables, getFormats, getFormatValue } from "../utils.js";
import { Category, Video } from "../types.js";

const { downloadPath, ytdlPath, ffmpegPath, forceIpv4 } = getPreferenceValues<ExtensionPreferences>();

export default async function tool(input: { url: string }) {
  const executables = await checkExecutables();
  const notInstalled = executables.filter(([, exists]) => !exists).map(([app]) => app);
  if (notInstalled.length > 0) {
    throw new Error(`${notInstalled.join(", ")} ${notInstalled.length > 1 ? "are" : "is"} not installed`);
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

  // Get the best video+audio format
  const formats = getFormats(video);
  const bestFormat = formats[Category.Video][0]; // First format in Video category is best quality
  if (bestFormat) {
    const formatValue = getFormatValue(bestFormat, Category.Video, true);
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

import { Tool } from "@raycast/api";
import { execa } from "execa";
import { preferences } from "../utils.js";
import fs from "node:fs";
import path from "node:path";

type Input = {
  /**
   * The URL of the video to download.
   */
  url: string;
};

export default async function tool(input: Input) {
  if (!fs.existsSync(preferences.ytdlPath)) {
    throw new Error("yt-dlp is not installed");
  }
  if (!fs.existsSync(preferences.ffmpegPath)) {
    throw new Error("ffmpeg is not installed");
  }
  if (!fs.existsSync(preferences.ffprobePath)) {
    throw new Error("ffprobe is not installed");
  }

  // Set up download options
  const options: string[] = [
    "-P",
    preferences.downloadPath,
    "--ffmpeg-location",
    preferences.ffmpegPath,
    "--progress",
    "--print",
    "after_move:filepath",
  ];

  if (preferences.forceIpv4) {
    options.push("--force-ipv4");
  }

  // Execute download
  const result = await execa(preferences.ytdlPath, [...options, input.url]);

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
  };
}

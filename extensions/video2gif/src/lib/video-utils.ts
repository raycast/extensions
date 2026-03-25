import { execa } from "execa";
import { stat } from "fs/promises";
import path from "path";
import { existsSync } from "fs";
import { VideoMetadata } from "../types";
import { getFfmpegPath, getFfprobePath } from "./ffmpeg";

/**
 * Get video metadata using ffprobe
 */
export async function getVideoMetadata(filePath: string): Promise<VideoMetadata> {
  const ffprobe = getFfprobePath();

  const { stdout } = await execa(ffprobe, [
    "-v",
    "quiet",
    "-print_format",
    "json",
    "-show_format",
    "-show_streams",
    "--",
    filePath,
  ]);

  let data;
  try {
    data = JSON.parse(stdout);
  } catch {
    throw new Error("Failed to parse video metadata. The file may be corrupted.");
  }

  if (!data || typeof data !== "object" || !Array.isArray(data.streams)) {
    throw new Error("Unexpected video metadata format");
  }
  const videoStream = data.streams?.find((s: { codec_type: string }) => s.codec_type === "video");

  if (!videoStream) {
    throw new Error("No video stream found in file");
  }

  const fileStat = await stat(filePath);

  return {
    duration: parseFloat(data.format?.duration || videoStream.duration || "0"),
    width: parseInt(videoStream.width || "0", 10),
    height: parseInt(videoStream.height || "0", 10),
    fileSize: fileStat.size,
    codec: videoStream.codec_name || "unknown",
  };
}

/**
 * Extract a thumbnail frame from the video
 * Returns the path to the generated thumbnail
 */
export async function extractThumbnail(filePath: string, outputDir: string): Promise<string> {
  const ffmpeg = getFfmpegPath();
  const thumbPath = path.join(outputDir, `thumb_${Date.now()}.png`);

  await execa(ffmpeg, ["-i", "--", filePath, "-vf", "thumbnail", "-frames:v", "1", "-y", thumbPath]);

  return thumbPath;
}

/**
 * Format seconds as MM:SS or HH:MM:SS
 */
export function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);

  if (h > 0) {
    return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  }
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

/**
 * Parse a time string (MM:SS or HH:MM:SS) to seconds
 */
export function parseTimeToSeconds(time: string): number {
  const parts = time.split(":").map(Number);
  if (parts.some(isNaN)) return 0;
  if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  }
  if (parts.length === 2) {
    return parts[0] * 60 + parts[1];
  }
  return 0;
}

/**
 * Format bytes to human-readable string
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

/**
 * Generate a unique output path, avoiding overwrites
 */
export function getOutputPath(inputPath: string, outputFolder: string): string {
  const baseName = path.basename(inputPath, path.extname(inputPath));
  let outputPath = path.join(outputFolder, `${baseName}.gif`);
  let counter = 1;

  while (existsSync(outputPath)) {
    outputPath = path.join(outputFolder, `${baseName} (${counter}).gif`);
    counter++;
  }

  return outputPath;
}

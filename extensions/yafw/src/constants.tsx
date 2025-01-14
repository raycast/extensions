import { getPreferenceValues } from "@raycast/api";

export type CompressionOptionKey = "best_quality" | "balanced" | "small_file" | "very_small_file";
export type CompressionOption = { crf: number; bitrate: string; bufsize: string };
export const COMPRESSION_OPTIONS: Record<CompressionOptionKey, CompressionOption> = {
  best_quality: { crf: 23, bitrate: "3000k", bufsize: "6000k" },
  balanced: { crf: 28, bitrate: "2000k", bufsize: "4000k" },
  small_file: { crf: 35, bitrate: "1000k", bufsize: "2000k" },
  very_small_file: { crf: 42, bitrate: "500k", bufsize: "1000k" },
};
export const DEFAULT_COMPRESSION: CompressionOptionKey = "balanced";
export const VIDEO_FORMATS = ["mp4", "mov", "avi", "mkv", "webm", "gif"];
export const PATH = [
  ".",
  "/bin",
  "~/.bin",
  "/usr/bin",
  "/usr/gnu/bin",
  "/usr/local/bin",
  "/opt/homebrew/bin",
  "/opt/homebrew/sbin",
  "/usr/local/Cellar/ffmpeg",
].join(":");
export const FFMPEG_BINARY_CUSTOM_PATH = getPreferenceValues().ffmpeg_path ?? "/opt/homebrew/bin/ffmpeg";

import { execFile } from "child_process";
import { promisify } from "util";
import type { FormValues } from "../types";
import { findFFmpegTools } from "./ffmpegRuntime";

const execFileAsync = promisify(execFile);
export interface MediaInfo {
  duration: number;
  fps: number;
  width: number;
  hasAudio: boolean;
}

export function parseFrameRate(value?: string): number {
  if (!value) return 0;
  const [numerator, denominator = "1"] = value.split("/").map(Number);
  const fps = numerator / Number(denominator);
  return Number.isFinite(fps) && fps > 0 ? fps : 0;
}

export async function inspectMedia(file: string, signal?: AbortSignal): Promise<MediaInfo> {
  const tools = findFFmpegTools();
  if (!tools) throw new Error("FFmpeg and ffprobe are required");
  const { stdout } = await execFileAsync(
    tools.ffprobe,
    ["-v", "error", "-show_format", "-show_streams", "-of", "json", file],
    { windowsHide: true, timeout: 15000, signal },
  );
  const data = JSON.parse(stdout);
  const video = data.streams?.find((stream: { codec_type: string }) => stream.codec_type === "video");
  const duration = Number(video?.duration || data.format?.duration);
  if (!video || !Number.isFinite(duration) || duration <= 0) throw new Error("Cannot read video duration");
  return {
    duration,
    fps: parseFrameRate(video.avg_frame_rate) || parseFrameRate(video.r_frame_rate),
    width: Number(video.width),
    hasAudio: data.streams.some((stream: { codec_type: string }) => stream.codec_type === "audio"),
  };
}

export function gifFps(value: string, info: MediaInfo): number {
  const fps = value.trim() ? Number(value) : info.fps;
  if (!Number.isFinite(fps) || fps <= 0) throw new Error("Enter a valid GIF FPS; the source frame rate is unavailable");
  if (value.trim() && fps > 100) throw new Error("GIF FPS must be between 0 and 100");
  return Math.min(fps, 100);
}

export function validateGifSettings(quality: string, fps: string): void {
  if (!/^\d+$/.test(quality) || Number(quality) < 1 || Number(quality) > 100)
    throw new Error("GIF quality must be a whole number from 1 to 100");
  if (fps.trim() && (!Number.isFinite(Number(fps)) || Number(fps) <= 0 || Number(fps) > 100))
    throw new Error("GIF FPS must be greater than 0 and at most 100");
}

export function estimateVideoBytes(values: FormValues, info: MediaInfo): number {
  if (values.compressionMode === "filesize") {
    const size = Number(values.maxSize);
    if (!Number.isFinite(size) || size <= 0) throw new Error("Enter a valid target size");
    return size * 1_000_000;
  }
  const audio =
    !values.removeAudio && (info.hasAudio || values.audioFiles.length > 0) ? Number(values.audioBitrate) : 0;
  const bitrate = Number(values.bitrate);
  if (!Number.isFinite(bitrate + audio) || bitrate <= 0 || audio < 0) throw new Error("Enter a valid bitrate");
  return ((bitrate + audio) * 1000 * info.duration) / 8;
}

export function formatSize(bytes: number): string {
  return bytes < 1_000_000 ? `${(bytes / 1000).toFixed(0)} KB` : `${(bytes / 1_000_000).toFixed(1)} MB`;
}

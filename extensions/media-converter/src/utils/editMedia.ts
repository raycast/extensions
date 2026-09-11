import fs from "node:fs";
import path from "node:path";
import { findFFmpegPath } from "./ffmpeg";
import { probeDurationSec, runFFmpegWithProgress, type ProgressInfo } from "./ffmpegRun";
import { inspectMedia } from "./mediaProbe";
import { formatProcessForDisplay, type ProcessSpec } from "./process";
import { getMediaType, type AllOutputExtension } from "../types/media";
import { recordEditHistory } from "./historyRecording";

export type EditRequest =
  | {
      operation: "resize-crop";
      width?: number;
      height?: number;
      cropWidth?: number;
      cropHeight?: number;
      cropX?: number;
      cropY?: number;
    }
  | { operation: "speed"; speed: number }
  | { operation: "extract-audio"; audioFormat: ".mp3" | ".m4a" | ".wav" | ".flac" }
  | { operation: "normalize"; integratedLufs: number }
  | { operation: "subtitles"; mode: "burn" | "remove"; subtitlePath?: string };

export type EditOptions = {
  outputDir?: string;
  signal?: AbortSignal;
  onProgress?: (progress: ProgressInfo) => void;
};

export async function editMedia(inputPath: string, request: EditRequest, options: EditOptions = {}): Promise<string> {
  const startedAt = Date.now();
  const ffmpeg = await findFFmpegPath();
  if (!ffmpeg) throw new Error("FFmpeg is not installed or configured.");
  const inspection = await inspectMedia(inputPath);
  const hasAudio = inspection.streams.some((stream) => stream.type === "audio");
  const hasVideo = inspection.streams.some((stream) => stream.type === "video");
  const outputExtension = editOutputExtension(inputPath, request);
  const outputPath = uniqueEditPath(inputPath, outputExtension, options.outputDir);
  const spec = buildEditProcessSpec(ffmpeg.path, inputPath, outputPath, request, { hasAudio, hasVideo });
  const duration = inspection.durationSec ?? (await probeDurationSec(ffmpeg.path, inputPath)) ?? undefined;
  console.log(`Executing FFmpeg edit command: ${formatProcessForDisplay(spec)}`);
  await runFFmpegWithProgress(spec, {
    totalDurationSec: duration,
    onProgress: options.onProgress,
    signal: options.signal,
  });
  try {
    await recordEditHistory({
      input: inputPath,
      output: outputPath,
      outputFormat: outputExtension,
      durationMs: Date.now() - startedAt,
    });
  } catch (error) {
    console.warn("Failed to write edit history:", error);
  }
  return outputPath;
}

export function buildEditProcessSpec(
  ffmpegPath: string,
  inputPath: string,
  outputPath: string,
  request: EditRequest,
  streams: { hasAudio: boolean; hasVideo: boolean },
): ProcessSpec {
  const args = ["-i", inputPath];
  const inputType = getMediaType(path.extname(inputPath));
  switch (request.operation) {
    case "resize-crop": {
      if (!streams.hasVideo) throw new Error("Resize and crop require an image or video stream.");
      const filters: string[] = [];
      const cropRequested =
        request.cropWidth !== undefined ||
        request.cropHeight !== undefined ||
        (request.cropX !== undefined && request.cropX !== 0) ||
        (request.cropY !== undefined && request.cropY !== 0);
      if (cropRequested) {
        if (request.cropWidth === undefined || request.cropHeight === undefined) {
          throw new Error("Enter both crop width and crop height.");
        }
        filters.push(
          `crop=${positiveInteger(request.cropWidth, "Crop width")}:${positiveInteger(request.cropHeight, "Crop height")}:${nonNegativeInteger(request.cropX ?? 0, "Crop X")}:${nonNegativeInteger(request.cropY ?? 0, "Crop Y")}`,
        );
      }
      const resizeRequested = request.width !== undefined || request.height !== undefined;
      if (resizeRequested) {
        filters.push(
          `scale=${request.width !== undefined ? positiveInteger(request.width, "Width") : -1}:${request.height !== undefined ? positiveInteger(request.height, "Height") : -1}`,
        );
      }
      if (filters.length === 0) throw new Error("Enter resize dimensions or a crop rectangle.");
      args.push("-vf", filters.join(","));
      if (inputType === "video") {
        args.push("-c:v", "libx264", "-preset", "medium", "-crf", "23");
        if (streams.hasAudio) args.push("-c:a", "aac", "-b:a", "192k");
      }
      break;
    }
    case "speed": {
      if (!Number.isFinite(request.speed) || request.speed < 0.25 || request.speed > 4) {
        throw new Error("Speed must be between 0.25× and 4×.");
      }
      if (streams.hasVideo) args.push("-filter:v", `setpts=PTS/${request.speed}`);
      if (streams.hasAudio) args.push("-filter:a", buildAtempoFilter(request.speed));
      if (!streams.hasVideo && !streams.hasAudio) throw new Error("No editable audio or video stream was found.");
      if (streams.hasVideo) args.push("-c:v", "libx264", "-preset", "medium", "-crf", "23");
      if (streams.hasAudio) {
        args.push("-c:a", streams.hasVideo ? "aac" : "libmp3lame", "-b:a", "192k");
      }
      break;
    }
    case "extract-audio":
      if (!streams.hasAudio) throw new Error("This file has no audio stream to extract.");
      args.push("-vn", ...audioCodecArgs(request.audioFormat));
      break;
    case "normalize":
      if (!streams.hasAudio) throw new Error("This file has no audio stream to normalize.");
      if (!Number.isFinite(request.integratedLufs) || request.integratedLufs < -70 || request.integratedLufs > -5) {
        throw new Error("Integrated loudness must be between -70 and -5 LUFS.");
      }
      args.push("-af", `loudnorm=I=${request.integratedLufs}:TP=-1.5:LRA=11`);
      if (streams.hasVideo) {
        args.push("-c:v", "libx264", "-preset", "medium", "-crf", "23", "-c:a", "aac", "-b:a", "192k");
      } else args.push("-c:a", "libmp3lame", "-b:a", "192k");
      break;
    case "subtitles":
      if (!streams.hasVideo) throw new Error("Subtitle editing requires a video stream.");
      if (request.mode === "remove") {
        args.push("-map", "0:v:0", "-map", "0:a?", "-sn", "-c:v", "libx264", "-preset", "medium", "-crf", "23");
        if (streams.hasAudio) args.push("-c:a", "aac", "-b:a", "192k");
      } else {
        if (!request.subtitlePath || !fs.existsSync(request.subtitlePath)) {
          throw new Error("Choose an existing subtitle file.");
        }
        args.push(
          "-vf",
          `subtitles=filename='${escapeFilterPath(request.subtitlePath)}'`,
          "-c:v",
          "libx264",
          "-preset",
          "medium",
          "-crf",
          "23",
        );
        if (streams.hasAudio) args.push("-c:a", "aac", "-b:a", "192k");
      }
      break;
  }
  args.push("-y", outputPath);
  return { command: ffmpegPath, args };
}

export function buildAtempoFilter(speed: number): string {
  const factors: number[] = [];
  let remaining = speed;
  while (remaining > 2) {
    factors.push(2);
    remaining /= 2;
  }
  while (remaining < 0.5) {
    factors.push(0.5);
    remaining /= 0.5;
  }
  factors.push(remaining);
  return factors.map((factor) => `atempo=${Number(factor.toFixed(5))}`).join(",");
}

function editOutputExtension(inputPath: string, request: EditRequest): AllOutputExtension {
  if (request.operation === "extract-audio") return request.audioFormat;
  const inputType = getMediaType(path.extname(inputPath));
  if (inputType === "image") {
    const extension = path.extname(inputPath).toLowerCase();
    return [".jpg", ".png", ".webp", ".tiff", ".avif"].includes(extension) ? (extension as AllOutputExtension) : ".png";
  }
  if (inputType === "audio") return ".mp3";
  return ".mp4";
}

function uniqueEditPath(inputPath: string, extension: string, outputDir?: string): string {
  const dir = outputDir || path.dirname(inputPath);
  const base = `${path.basename(inputPath, path.extname(inputPath))}-edited`;
  let output = path.join(dir, `${base}${extension}`);
  let counter = 1;
  while (fs.existsSync(output)) output = path.join(dir, `${base}(${counter++})${extension}`);
  return output;
}

function audioCodecArgs(format: ".mp3" | ".m4a" | ".wav" | ".flac"): string[] {
  if (format === ".mp3") return ["-c:a", "libmp3lame", "-b:a", "192k"];
  if (format === ".m4a") return ["-c:a", "aac", "-b:a", "192k"];
  if (format === ".wav") return ["-c:a", "pcm_s16le"];
  return ["-c:a", "flac"];
}

function positiveInteger(value: number, label: string): number {
  if (!Number.isInteger(value) || value <= 0) throw new Error(`${label} must be a positive whole number.`);
  return value;
}

function nonNegativeInteger(value: number, label: string): number {
  if (!Number.isInteger(value) || value < 0) throw new Error(`${label} must be 0 or a positive whole number.`);
  return value;
}

function escapeFilterPath(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/:/g, "\\:").replace(/'/g, "\\'");
}

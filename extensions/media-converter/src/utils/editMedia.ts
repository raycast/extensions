import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { findFFmpegPath, MIN_FFMPEG_HEIC_INPUT_VERSION, supportsHeicInput } from "./ffmpeg";
import { probeDurationSec, runFFmpegWithProgress, type ProgressInfo } from "./ffmpegRun";
import { inspectMedia } from "./mediaProbe";
import { formatProcessForDisplay, runProcess, type ProcessSpec } from "./process";
import { getMediaType, OUTPUT_ALL_EXTENSIONS, type AllOutputExtension } from "../types/media";
import { recordEditHistory } from "./historyRecording";
import { buildTrimArgs, preserveFileTimestamps, replaceFileSafely } from "./converter";
import { resolveTrim } from "./conversionOptions";
import { trimmedDuration } from "./targetSize";

export const EDIT_FRAME_RATES = [24, 30, 60] as const;

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
  | { operation: "trim"; start?: string; end?: string; replaceOriginal?: boolean }
  | { operation: "speed"; speed: number; frameRate?: number; removeAudio?: boolean }
  | { operation: "frame-rate"; frameRate: number; removeAudio?: boolean }
  | { operation: "remove-audio" }
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
  const replaceOriginal = request.operation === "trim" && request.replaceOriginal === true;
  const outputExtension = editOutputExtension(inputPath, request);
  const fileExtension =
    request.operation === "trim" ? path.extname(inputPath).toLowerCase() || outputExtension : outputExtension;
  const writeTarget = replaceOriginal
    ? tempReplacePath(inputPath)
    : uniqueEditPath(
        inputPath,
        fileExtension,
        options.outputDir,
        request.operation === "trim" ? "-trimmed" : "-edited",
      );
  let effectiveInputPath = inputPath;
  let tempHeicPng: string | null = null;
  if (path.extname(inputPath).toLowerCase() === ".heic" && request.operation === "resize-crop") {
    if (!supportsHeicInput(ffmpeg.version)) {
      throw new Error(
        `HEIC input requires macOS or FFmpeg ${MIN_FFMPEG_HEIC_INPUT_VERSION}+ (found FFmpeg v${ffmpeg.version}).`,
      );
    }
    tempHeicPng = path.join(os.tmpdir(), `${path.basename(inputPath, path.extname(inputPath))}_edit_${Date.now()}.png`);
    const decodeSpec: ProcessSpec =
      process.platform === "darwin"
        ? { command: "sips", args: ["--setProperty", "format", "png", inputPath, "--out", tempHeicPng] }
        : {
            command: ffmpeg.path,
            args: ["-i", inputPath, "-frames:v", "1", "-compression_level", "1", "-y", tempHeicPng],
          };
    try {
      await runProcess(decodeSpec, options.signal);
      effectiveInputPath = tempHeicPng;
    } catch (error) {
      if (fs.existsSync(tempHeicPng)) {
        try {
          fs.unlinkSync(tempHeicPng);
        } catch {
          /* ignore temp cleanup error */
        }
      }
      throw error;
    }
  }
  const spec = buildEditProcessSpec(ffmpeg.path, effectiveInputPath, writeTarget, request, { hasAudio, hasVideo });
  const duration = inspection.durationSec ?? (await probeDurationSec(ffmpeg.path, inputPath)) ?? undefined;
  const expectedDuration =
    request.operation === "speed" && duration !== undefined
      ? duration / request.speed
      : request.operation === "trim" && duration !== undefined
        ? trimmedDuration(duration, resolveTrim(request.start, request.end).trim)
        : duration;
  console.log(`Executing FFmpeg edit command: ${formatProcessForDisplay(spec)}`);
  try {
    await runFFmpegWithProgress(spec, {
      totalDurationSec: expectedDuration,
      onProgress: options.onProgress,
      signal: options.signal,
    });
    preserveFileTimestamps(inputPath, writeTarget);
    if (replaceOriginal) {
      await replaceFileSafely(writeTarget, inputPath);
    }
  } catch (error) {
    if (replaceOriginal && fs.existsSync(writeTarget)) {
      try {
        fs.unlinkSync(writeTarget);
      } catch {
        /* ignore temp cleanup error */
      }
    }
    throw error;
  } finally {
    if (tempHeicPng && fs.existsSync(tempHeicPng)) {
      try {
        fs.unlinkSync(tempHeicPng);
      } catch {
        /* ignore temp cleanup error */
      }
    }
  }
  const outputPath = replaceOriginal ? inputPath : writeTarget;
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
    case "trim": {
      if (inputType !== "video" && inputType !== "audio") {
        throw new Error("Trim requires a video or audio file.");
      }
      if (!streams.hasVideo && !streams.hasAudio) {
        throw new Error("No trimmable audio or video stream was found.");
      }
      const trimResolution = resolveTrim(request.start, request.end);
      if (trimResolution.error) throw new Error(trimResolution.error);
      if (!trimResolution.trim) throw new Error("Enter a start time, end time, or both to trim.");
      const trimArgs = buildTrimArgs(trimResolution.trim);
      const ext = path.extname(outputPath).toLowerCase();
      const faststartArgs = ext === ".mp4" || ext === ".m4a" ? ["-movflags", "+faststart"] : [];
      return {
        command: ffmpegPath,
        args: [...trimArgs, "-i", inputPath, "-c", "copy", ...faststartArgs, "-map_metadata", "0", "-y", outputPath],
      };
    }
    case "speed": {
      if (!Number.isFinite(request.speed) || request.speed < 0.25 || request.speed > 40) {
        throw new Error("Speed must be between 0.25× and 40×.");
      }
      if (request.frameRate !== undefined || request.removeAudio) {
        requireVideoInput(inputType, streams.hasVideo);
      }
      if (streams.hasVideo) {
        const filters = [`setpts=PTS/${request.speed}`];
        if (request.frameRate !== undefined) filters.push(frameRateFilter(request.frameRate));
        args.push("-filter:v", filters.join(","));
      }
      if (request.removeAudio) args.push("-an");
      else if (streams.hasAudio) args.push("-filter:a", buildAtempoFilter(request.speed));
      if (!streams.hasVideo && !streams.hasAudio) throw new Error("No editable audio or video stream was found.");
      if (streams.hasVideo) args.push("-c:v", "libx264", "-preset", "medium", "-crf", "23");
      if (streams.hasAudio && !request.removeAudio) {
        args.push("-c:a", streams.hasVideo ? "aac" : "libmp3lame", "-b:a", "192k");
      }
      break;
    }
    case "frame-rate":
      requireVideoInput(inputType, streams.hasVideo);
      args.push("-vf", frameRateFilter(request.frameRate), "-c:v", "libx264", "-preset", "medium", "-crf", "23");
      if (request.removeAudio) args.push("-an");
      else if (streams.hasAudio) args.push("-c:a", "aac", "-b:a", "192k");
      break;
    case "remove-audio":
      requireVideoInput(inputType, streams.hasVideo);
      args.push("-map", "0:v:0", "-an", "-c:v", "libx264", "-preset", "medium", "-crf", "23");
      break;
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

function requireVideoInput(inputType: string | null, hasVideo: boolean): void {
  if (inputType !== "video" || !hasVideo) throw new Error("Frame rate and audio removal require a video file.");
}

function frameRateFilter(frameRate: number): string {
  if (!EDIT_FRAME_RATES.some((rate) => rate === frameRate)) {
    throw new Error("Output frame rate must be 24, 30, or 60 fps.");
  }
  return `fps=${frameRate}`;
}

function editOutputExtension(inputPath: string, request: EditRequest): AllOutputExtension {
  if (request.operation === "extract-audio") return request.audioFormat;
  const inputType = getMediaType(path.extname(inputPath));
  if (request.operation === "trim") {
    const extension = path.extname(inputPath).toLowerCase();
    if ((OUTPUT_ALL_EXTENSIONS as readonly string[]).includes(extension)) {
      return extension as AllOutputExtension;
    }
    return inputType === "audio" ? ".mp3" : ".mp4";
  }
  if (inputType === "image") {
    const extension = path.extname(inputPath).toLowerCase();
    return [".jpg", ".png", ".webp", ".tiff", ".avif"].includes(extension) ? (extension as AllOutputExtension) : ".png";
  }
  if (inputType === "audio") return ".mp3";
  return ".mp4";
}

function uniqueEditPath(inputPath: string, extension: string, outputDir?: string, suffix = "-edited"): string {
  const dir = outputDir || path.dirname(inputPath);
  const base = `${path.basename(inputPath, path.extname(inputPath))}${suffix}`;
  let output = path.join(dir, `${base}${extension}`);
  let counter = 1;
  while (fs.existsSync(output)) output = path.join(dir, `${base}(${counter++})${extension}`);
  return output;
}

function tempReplacePath(inputPath: string): string {
  const dir = path.dirname(inputPath);
  const ext = path.extname(inputPath);
  const base = path.basename(inputPath, ext);
  return path.join(dir, `${base}.trim-tmp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}${ext}`);
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

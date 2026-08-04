import { findFFmpegPath } from "./ffmpeg";
import { probeDurationSec } from "./ffmpegRun";
import { parseTimeString } from "./time";
import type { AllOutputExtension, QualitySettings, TrimOptions } from "../types/media";

export type TargetSizePlan = {
  targetSizeMb: number;
  durationSec: number;
  videoBitrateKbps: number;
  audioBitrateKbps: number;
  estimatedBytes: number;
};

export function calculateTargetSizePlan(
  targetSizeMb: number,
  durationSec: number,
  audioBitrateKbps = 128,
): TargetSizePlan {
  if (!Number.isFinite(targetSizeMb) || targetSizeMb <= 0) throw new Error("Target size must be greater than 0 MB.");
  if (!Number.isFinite(durationSec) || durationSec <= 0) throw new Error("Could not determine media duration.");
  const totalBitrateKbps = (targetSizeMb * 8192 * 0.97) / durationSec;
  const videoBitrateKbps = Math.floor(totalBitrateKbps - audioBitrateKbps);
  if (videoBitrateKbps < 100) {
    throw new Error(`Target size is too small for this duration. Try at least ${minimumTargetMb(durationSec)} MB.`);
  }
  return {
    targetSizeMb,
    durationSec,
    videoBitrateKbps,
    audioBitrateKbps,
    estimatedBytes: Math.round(((videoBitrateKbps + audioBitrateKbps) * durationSec * 1000) / 8),
  };
}

export async function resolveTargetSizeQuality(
  inputPath: string,
  outputFormat: AllOutputExtension,
  baseQuality: QualitySettings,
  targetSizeMb: number,
  trim?: TrimOptions,
): Promise<{ quality: QualitySettings; plan: TargetSizePlan }> {
  if (!supportsTargetSize(outputFormat)) {
    throw new Error("Target-size mode supports MP4, MKV, WebM, AVI, and MPG video outputs.");
  }
  const ffmpeg = await findFFmpegPath();
  if (!ffmpeg) throw new Error("FFmpeg is not installed or configured.");
  const sourceDuration = await probeDurationSec(ffmpeg.path, inputPath);
  if (!sourceDuration) throw new Error("Could not determine input duration for target-size conversion.");
  const durationSec = trimmedDuration(sourceDuration, trim);
  const plan = calculateTargetSizePlan(targetSizeMb, durationSec);
  const current = (baseQuality as Record<string, Record<string, unknown>>)[outputFormat] ?? {};
  return {
    quality: {
      [outputFormat]: {
        ...current,
        encodingMode: "vbr-2-pass",
        bitrate: String(plan.videoBitrateKbps),
        maxBitrate: "",
      },
    } as unknown as QualitySettings,
    plan,
  };
}

export function supportsTargetSize(outputFormat: AllOutputExtension): boolean {
  return [".mp4", ".mkv", ".webm", ".avi", ".mpg"].includes(outputFormat);
}

export function trimmedDuration(sourceDurationSec: number, trim?: TrimOptions): number {
  const start = parseTimeString(trim?.start ?? "") ?? 0;
  const end = parseTimeString(trim?.end ?? "") ?? sourceDurationSec;
  return Math.max(0, Math.min(sourceDurationSec, end) - Math.min(sourceDurationSec, start));
}

function minimumTargetMb(durationSec: number): number {
  return Math.ceil(((100 + 128) * durationSec) / 8192 / 0.97);
}

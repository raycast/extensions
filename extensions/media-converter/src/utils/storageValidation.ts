import {
  AUDIO_BITRATES,
  AUDIO_BIT_DEPTH,
  AUDIO_COMPRESSION_LEVEL,
  AUDIO_PROFILES,
  AUDIO_SAMPLE_RATES,
  GIF_FPS,
  GIF_WIDTH,
  OUTPUT_ALL_EXTENSIONS,
  VIDEO_ENCODING_MODES,
  type AllOutputExtension,
  type MediaType,
  type QualitySettings,
  type TrimOptions,
} from "../types/media";
import { resolveTrim } from "./conversionOptions";

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasString(value: unknown, allowed?: readonly string[]): value is string {
  return typeof value === "string" && (!allowed || allowed.includes(value));
}

function hasPercent(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 100;
}

export function parseTrim(value: unknown): TrimOptions | undefined | null {
  if (value === undefined) return undefined;
  if (!isRecord(value)) return null;
  const start = value.start;
  const end = value.end;
  if (start !== undefined && typeof start !== "string") return null;
  if (end !== undefined && typeof end !== "string") return null;
  const resolved = resolveTrim(start as string | undefined, end as string | undefined);
  return resolved.error ? null : resolved.trim;
}

export function isQualitySettings(format: AllOutputExtension, value: unknown): value is QualitySettings {
  if (!isRecord(value) || !(format in value)) return false;
  const q = value[format];
  switch (format) {
    case ".jpg":
    case ".heic":
    case ".avif":
      return hasPercent(q);
    case ".png":
      return hasString(q, ["png-24", "png-8"]);
    case ".webp":
      return q === "lossless" || hasPercent(q);
    case ".tiff":
      return hasString(q, ["deflate", "lzw"]);
    case ".gif":
      return isRecord(q) && hasString(q.fps, GIF_FPS) && hasString(q.width, GIF_WIDTH) && typeof q.loop === "boolean";
    case ".mp3":
      return isRecord(q) && hasString(q.bitrate, AUDIO_BITRATES) && (q.vbr === undefined || typeof q.vbr === "boolean");
    case ".aac":
    case ".m4a":
      return (
        isRecord(q) &&
        hasString(q.bitrate, AUDIO_BITRATES) &&
        (q.profile === undefined || hasString(q.profile, AUDIO_PROFILES))
      );
    case ".wav":
      return isRecord(q) && hasString(q.sampleRate, AUDIO_SAMPLE_RATES) && hasString(q.bitDepth, AUDIO_BIT_DEPTH);
    case ".flac":
      return (
        isRecord(q) &&
        hasString(q.compressionLevel, AUDIO_COMPRESSION_LEVEL) &&
        hasString(q.sampleRate, AUDIO_SAMPLE_RATES) &&
        hasString(q.bitDepth, ["16", "24"])
      );
    case ".mov":
      return isRecord(q) && hasString(q.variant, ["4444xq", "4444", "hq", "standard", "lt", "proxy"]);
    default:
      if (!isRecord(q)) return false;
      if (!hasString(q.encodingMode, VIDEO_ENCODING_MODES)) return false;
      if (q.encodingMode === "crf") return hasPercent(q.crf);
      return typeof q.bitrate === "string" && (q.maxBitrate === undefined || typeof q.maxBitrate === "string");
  }
}

export function parseOutputFormat(value: unknown): AllOutputExtension | null {
  return hasString(value) && (OUTPUT_ALL_EXTENSIONS as readonly string[]).includes(value)
    ? (value as AllOutputExtension)
    : null;
}

export function parseMediaType(value: unknown): MediaType | "gif" | null {
  return hasString(value, ["image", "audio", "video", "gif"]) ? (value as MediaType | "gif") : null;
}

export function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

export function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

import { convertMedia, ConvertOptions } from "../utils/converter";
import {
  type QualitySettings,
  type QualityLevel,
  type OutputImageExtension,
  type OutputAudioExtension,
  type OutputVideoExtension,
  type AllOutputExtension,
  type ImageQuality,
  type AudioQuality,
  type VideoQuality,
  type GifQuality,
  type GifFps,
  type GifWidth,
  getMediaType,
  getOutputCategory,
  VIDEO_ENCODING_MODES,
  type VideoEncodingMode,
} from "../types/media";
import { findFFmpegPath } from "../utils/ffmpeg";
import { findPreset } from "../utils/presets";
import { resolveExistingDirectory, resolveExistingFile, resolveTrim } from "../utils/conversionOptions";
import { resolveQualitySettings } from "../utils/qualityResolver";
import { recordConversionHistory } from "../utils/historyRecording";
import { resolveTargetSizeQuality, supportsTargetSize } from "../utils/targetSize";
import type { Tool } from "@raycast/api";
import path from "path";

type Input = {
  inputPath: string;
  // I cannot, for the life of me, figure out how to get the type of this array to be a union of its values
  // so I have to type it manually. @sacha_crispin
  // Want to try?
  // Uncomment AllOutputExtension in import in ../types/media.ts
  outputFileType: // VIDEO
  | ".mp4"
    | ".avi"
    | ".mov"
    | ".mkv"
    | ".mpg"
    | ".webm"
    // AUDIO
    | ".mp3"
    | ".aac"
    | ".wav"
    | ".flac"
    | ".m4a"
    // IMAGE
    | ".jpg"
    | ".png"
    | ".webp"
    | ".heic"
    | ".tiff"
    | ".avif"
    // GIF (from video input)
    | ".gif";
  // Simple mode quality (optional). If omitted, sensible defaults apply.
  quality?: QualityLevel;

  // --- Optional cross-cutting controls ---
  /** Absolute path to output folder. Must exist. */
  outputDir?: string;
  /** Remove EXIF/GPS/tags from output. */
  stripMetadata?: boolean;
  /** Trim start time, e.g. "0:10" or "10.5" (seconds). */
  trimStart?: string;
  /** Trim end time, e.g. "1:30" or "90" (seconds). */
  trimEnd?: string;
  /** Approximate target output size in megabytes for video outputs. Uses two-pass bitrate encoding. */
  targetSizeMb?: number;
  /** Preset ID to apply. If set, overrides most other params. */
  presetId?: string;

  // --- Optional GIF controls (apply when outputFileType === ".gif") ---
  gifFps?: "10" | "15" | "24" | "30";
  gifWidth?: "original" | "480" | "720" | "1080";
  gifLoop?: boolean;

  // --- Optional advanced image controls (apply when relevant) ---
  // Generic percentage for JPG/WEBP/HEIC/AVIF (0-100)
  imageQualityPercent?: number;
  // WEBP only: lossless mode (overrides imageQualityPercent)
  webpLossless?: boolean;
  // PNG only: "png-24" | "png-8"
  pngVariant?: "png-24" | "png-8";
  // TIFF only: "deflate" | "lzw"
  tiffCompression?: "deflate" | "lzw";

  // --- Optional advanced audio controls (apply when relevant) ---
  audioBitrate?: "64" | "96" | "128" | "160" | "192" | "224" | "256" | "320";
  audioVbr?: boolean;
  audioProfile?: "aac_low" | "aac_he" | "aac_he_v2";
  audioSampleRate?: "22050" | "44100" | "48000" | "96000";
  audioBitDepth?: "16" | "24" | "32";
  flacCompressionLevel?: "0" | "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8";

  // --- Optional advanced video controls (apply when relevant) ---
  videoEncodingMode?: "crf" | "vbr" | "vbr-2-pass";
  videoCrf?: number; // 0-100 (mapped internally)
  videoBitrate?:
    | "50000"
    | "40000"
    | "30000"
    | "25000"
    | "20000"
    | "15000"
    | "10000"
    | "8000"
    | "5000"
    | "4000"
    | "3000"
    | "2000"
    | "1500"
    | "1000"
    | "750"
    | "500";
  videoMaxBitrate?:
    | ""
    | "50000"
    | "40000"
    | "30000"
    | "25000"
    | "20000"
    | "15000"
    | "10000"
    | "8000"
    | "5000"
    | "4000"
    | "3000"
    | "2000"
    | "1500"
    | "1000"
    | "750"
    | "500";
  videoPreset?: "veryslow" | "slower" | "slow" | "medium" | "fast" | "faster" | "veryfast" | "superfast" | "ultrafast";
  // MOV only
  proresVariant?: "4444xq" | "4444" | "hq" | "standard" | "lt" | "proxy";
  // WEBM only
  vp9Quality?: "best" | "good" | "realtime";
};

export default async function ConvertMedia(input: Input) {
  const startedAt = Date.now();
  const installed = await findFFmpegPath();
  if (!installed) {
    return {
      type: "error",
      message: "FFmpeg is not installed. Please install FFmpeg to use this tool.",
    };
  }

  // If a preset is specified, apply its settings on top of `input` before any processing.
  let effectiveInput: Input = input;
  let presetQuality: QualitySettings | undefined;
  if (input.presetId) {
    try {
      const preset = await findPreset(input.presetId);
      if (!preset) {
        return { type: "error", message: `Preset not found: ${input.presetId}` };
      }
      presetQuality = preset.quality;
      effectiveInput = {
        ...input,
        outputFileType: preset.outputFormat as Input["outputFileType"],
        outputDir: input.outputDir ?? preset.outputDir,
        stripMetadata: input.stripMetadata ?? preset.stripMetadata,
        trimStart: input.trimStart ?? preset.trim?.start,
        trimEnd: input.trimEnd ?? preset.trim?.end,
      };
    } catch (error) {
      return { type: "error", message: `Failed to load preset: ${String(error)}` };
    }
  }

  const {
    inputPath,
    outputFileType,
    quality,
    outputDir,
    stripMetadata,
    trimStart,
    trimEnd,
    targetSizeMb,
    gifFps,
    gifWidth,
    gifLoop,
    // image
    imageQualityPercent,
    webpLossless,
    pngVariant,
    tiffCompression,
    // audio
    audioBitrate,
    audioVbr,
    audioProfile,
    audioSampleRate,
    audioBitDepth,
    flacCompressionLevel,
    // video
    videoEncodingMode,
    videoCrf,
    videoBitrate,
    videoMaxBitrate,
    videoPreset,
    proresVariant,
    vp9Quality,
  } = effectiveInput;

  let fullPath: string;
  let mediaType: "image" | "audio" | "video" | null;

  try {
    const resolvedInput = resolveExistingFile(inputPath);
    if (!resolvedInput.path) throw new Error(resolvedInput.error);
    fullPath = resolvedInput.path;
    mediaType = getMediaType(path.extname(fullPath));

    if (!mediaType) {
      return {
        type: "error",
        message: `Unsupported input file type for path: ${fullPath}`,
      };
    }
  } catch (error) {
    // Handle missing / invalid input path errors thrown by getFullPath
    return {
      type: "error",
      message: String(error),
    };
  }

  // Validate optional output directory & load preset if given.
  const directory = resolveExistingDirectory(outputDir);
  if (directory.error) return { type: "error", message: directory.error };
  const resolvedOutputDir = directory.path;

  // Validate trim values.
  const trimResolution = resolveTrim(trimStart, trimEnd);
  if (trimResolution.error) return { type: "error", message: trimResolution.error };
  const trim = trimResolution.trim;

  // GIF output path: build GifQuality and bypass the normal quality builder.
  if (getOutputCategory(outputFileType as AllOutputExtension) === "gif") {
    if (mediaType !== "video") {
      return {
        type: "error",
        message: `GIF output requires a video input. Got ${mediaType} file: ${fullPath}`,
      };
    }
    const presetGif = presetQuality && ".gif" in presetQuality ? presetQuality[".gif"] : undefined;
    const fpsChoice = (gifFps ?? presetGif?.fps ?? "15") as GifFps;
    const widthChoice = (gifWidth ?? presetGif?.width ?? "original") as GifWidth;
    const loopChoice = typeof gifLoop === "boolean" ? gifLoop : (presetGif?.loop ?? true);
    const gifQuality: GifQuality = {
      ".gif": { fps: fpsChoice, width: widthChoice, loop: loopChoice },
    };
    try {
      const outputPath = await convertMedia(fullPath, ".gif", gifQuality, {
        outputDir: resolvedOutputDir,
        stripMetadata,
        trim,
      });
      await recordHistoryBestEffort({
        input: fullPath,
        output: outputPath,
        outputFormat: ".gif",
        quality: gifQuality,
        mediaType: "gif",
        trim,
        stripMetadata,
        outputDir: resolvedOutputDir,
        durationMs: Date.now() - startedAt,
      });
      return {
        type: "success",
        message: `✅ Converted video to GIF\n- Input: ${fullPath}\n- Output: ${outputPath}\n- Settings: ${fpsChoice}fps, width ${widthChoice}, loop=${loopChoice}`,
      };
    } catch (error) {
      console.error(error);
      return { type: "error", message: `❌ GIF conversion failed. Error: ${error}` };
    }
  }

  const convertOpts: ConvertOptions = {
    outputDir: resolvedOutputDir,
    stripMetadata,
    trim,
  };

  try {
    let outputPath: string;
    let qualitySettings = resolveQualitySettings(
      mediaType,
      outputFileType as OutputImageExtension | OutputAudioExtension | OutputVideoExtension,
      quality,
      {
        imageQualityPercent,
        webpLossless,
        pngVariant,
        tiffCompression,
        audioBitrate,
        audioVbr,
        audioProfile,
        audioSampleRate,
        audioBitDepth,
        flacCompressionLevel,
        videoEncodingMode,
        videoCrf,
        videoBitrate,
        videoMaxBitrate,
        videoPreset,
        proresVariant,
        vp9Quality,
      },
      presetQuality,
    );
    if (targetSizeMb !== undefined) {
      if (!supportsTargetSize(outputFileType)) {
        return { type: "error", message: `Target-size mode does not support ${outputFileType} output.` };
      }
      qualitySettings = (await resolveTargetSizeQuality(fullPath, outputFileType, qualitySettings, targetSizeMb, trim))
        .quality;
    }

    if (mediaType === "image") {
      outputPath = await convertMedia(
        fullPath,
        outputFileType as OutputImageExtension,
        qualitySettings as ImageQuality,
        convertOpts,
      );
    } else if (mediaType === "audio") {
      outputPath = await convertMedia(
        fullPath,
        outputFileType as OutputAudioExtension,
        qualitySettings as AudioQuality,
        convertOpts,
      );
    } else if (mediaType === "video") {
      outputPath = await convertMedia(
        fullPath,
        outputFileType as OutputVideoExtension,
        qualitySettings as VideoQuality,
        convertOpts,
      );
    } else {
      return {
        type: "error",
        message: `Cannot convert ${mediaType} to ${outputFileType}. Invalid conversion pair.`,
      };
    }

    const settingsSummary = summarizeSettings(mediaType, outputFileType, qualitySettings);
    await recordHistoryBestEffort({
      input: fullPath,
      output: outputPath,
      outputFormat: outputFileType,
      quality: qualitySettings,
      mediaType,
      trim,
      stripMetadata,
      outputDir: resolvedOutputDir,
      durationMs: Date.now() - startedAt,
    });
    return {
      type: "success",
      message: `✅ Converted ${mediaType} to ${outputFileType}\n- Input: ${fullPath}\n- Output: ${outputPath}\n- Settings: ${settingsSummary}`,
    };
  } catch (error) {
    console.error(error);
    return {
      type: "error",
      message: `❌ The ${mediaType} could not be converted. Error: ${error}`,
    };
  }
}

async function recordHistoryBestEffort(params: Parameters<typeof recordConversionHistory>[0]): Promise<void> {
  try {
    await recordConversionHistory(params);
  } catch (error) {
    console.warn("Failed to write conversion history:", error);
  }
}

export const confirmation: Tool.Confirmation<Input> = async (params: Input) => {
  try {
    const resolvedInput = resolveExistingFile(params.inputPath);
    if (!resolvedInput.path) throw new Error(resolvedInput.error);
    const fullPath = resolvedInput.path;
    const mediaType = getMediaType(path.extname(fullPath));
    const message = "This will create a new file in the same directory.";
    const info: { name: string; value: string }[] = [
      { name: "Input Path", value: fullPath },
      { name: "Input Media Type", value: mediaType || "Unknown" },
      { name: "Output File Type", value: params.outputFileType },
    ];

    // Add simple quality if present
    if (params.quality) info.push({ name: "Quality (simple)", value: String(params.quality) });

    // Add advanced options summary if present
    const advSummary = summarizeParams(params);
    if (advSummary) info.push({ name: "Advanced", value: advSummary });

    return {
      message,
      info,
    };
  } catch (error) {
    // If the path is invalid or missing, surface a clear explanation instead of throwing
    return {
      message: String(error),
      info: [],
    };
  }
};

// ------------------------- Helpers -------------------------

// Helper: get encodingMode value from a possibly-unknown object
function getEncodingMode(obj: unknown): VideoEncodingMode | undefined {
  if (typeof obj !== "object" || obj === null) return undefined;
  const mode = (obj as Record<string, unknown>).encodingMode;
  if (typeof mode === "string" && (VIDEO_ENCODING_MODES as readonly string[]).includes(mode)) {
    return mode as VideoEncodingMode;
  }
  return undefined;
}

// ----------------- Type guards -----------------
function isCrfLike(obj: unknown): obj is { crf: number } {
  return typeof obj === "object" && obj !== null && typeof (obj as Record<string, unknown>).crf === "number";
}

function isVbrLike(obj: unknown): obj is { bitrate: string; maxBitrate?: string } {
  return typeof obj === "object" && obj !== null && typeof (obj as Record<string, unknown>).bitrate === "string";
}

// NOTE: ProRes variant selection is handled by the centralized factory `buildVideoQuality`.

function summarizeSettings(
  mediaType: "image" | "audio" | "video",
  outputFileType: Input["outputFileType"],
  qualitySettings: QualitySettings,
): string {
  if (mediaType === "image") {
    const img = qualitySettings as Partial<ImageQuality>;
    switch (outputFileType as OutputImageExtension) {
      case ".jpg":
        return `quality ${img[".jpg"] as number}%`;
      case ".heic":
        return `quality ${img[".heic"] as number}%`;
      case ".avif":
        return `quality ${img[".avif"] as number}%`;
      case ".webp": {
        const v = img[".webp"] as ImageQuality[".webp"];
        return typeof v === "string" ? "lossless" : `quality ${v}%`;
      }
      case ".png":
        return `variant ${img[".png"] as ImageQuality[".png"]}`;
      case ".tiff":
        return `compression ${img[".tiff"] as ImageQuality[".tiff"]}`;
    }
  }
  if (mediaType === "audio") {
    const aud = qualitySettings as Partial<AudioQuality>;
    switch (outputFileType as OutputAudioExtension) {
      case ".mp3": {
        const v = aud[".mp3"] as AudioQuality[".mp3"];
        return `bitrate ${v.bitrate} kbps${v.vbr ? ", VBR" : ""}`;
      }
      case ".aac": {
        const v = aud[".aac"] as AudioQuality[".aac"];
        return `bitrate ${v.bitrate} kbps${v.profile ? `, profile ${v.profile}` : ""}`;
      }
      case ".m4a": {
        const v = aud[".m4a"] as AudioQuality[".m4a"];
        return `bitrate ${v.bitrate} kbps${v.profile ? `, profile ${v.profile}` : ""}`;
      }
      case ".wav": {
        const v = aud[".wav"] as AudioQuality[".wav"];
        return `${v.sampleRate} Hz, ${v.bitDepth}-bit`;
      }
      case ".flac": {
        const v = aud[".flac"] as AudioQuality[".flac"];
        return `level ${v.compressionLevel}, ${v.sampleRate} Hz, ${v.bitDepth}-bit`;
      }
    }
  }
  if (mediaType === "video") {
    const vid = qualitySettings as Partial<VideoQuality>;
    switch (outputFileType as OutputVideoExtension) {
      case ".mov": {
        const v = vid[".mov"] as VideoQuality[".mov"];
        return `ProRes ${v.variant}`;
      }
      case ".webm": {
        const v = vid[".webm"] as VideoQuality[".webm"];
        const enc = getEncodingMode(v);
        if (enc === "crf") {
          const vr = v as Extract<VideoQuality[".webm"], { encodingMode: "crf" }>;
          return `CRF ${vr.crf}, VP9 ${vr.quality}`;
        }
        const vr = v as Extract<VideoQuality[".webm"], { encodingMode: "vbr" | "vbr-2-pass" }>;
        return `${(enc ?? "").toUpperCase()} ${vr.bitrate} kbps${vr.maxBitrate ? ` max ${vr.maxBitrate}` : ""}, VP9 ${vr.quality}`;
      }
      case ".mp4": {
        const v = vid[".mp4"] as VideoQuality[".mp4"];
        const enc = getEncodingMode(v);
        if (enc === "crf") {
          const vr = v as Extract<VideoQuality[".mp4"], { encodingMode: "crf" }>;
          return `CRF ${vr.crf}, preset ${vr.preset}`;
        }
        const vr = v as Extract<VideoQuality[".mp4"], { encodingMode: "vbr" | "vbr-2-pass" }>;
        return `${(enc ?? "").toUpperCase()} ${vr.bitrate} kbps${vr.maxBitrate ? ` max ${vr.maxBitrate}` : ""}, preset ${vr.preset}`;
      }
      case ".mkv": {
        const v = vid[".mkv"] as VideoQuality[".mkv"];
        const enc = getEncodingMode(v);
        if (enc === "crf") {
          const vr = v as Extract<VideoQuality[".mkv"], { encodingMode: "crf" }>;
          return `CRF ${vr.crf}, preset ${vr.preset}`;
        }
        const vr = v as Extract<VideoQuality[".mkv"], { encodingMode: "vbr" | "vbr-2-pass" }>;
        return `${(enc ?? "").toUpperCase()} ${vr.bitrate} kbps${vr.maxBitrate ? ` max ${vr.maxBitrate}` : ""}, preset ${vr.preset}`;
      }
      case ".avi": {
        const v = vid[".avi"] as VideoQuality[".avi"];
        // Prefer runtime type guards instead of unsafe casts
        if (isCrfLike(v)) {
          return `CRF ${v.crf}`;
        }
        if (isVbrLike(v)) {
          return `${(getEncodingMode(v) ?? "").toUpperCase()} ${v.bitrate} kbps${v.maxBitrate ? ` max ${v.maxBitrate}` : ""}`;
        }
        return "default";
      }
      case ".mpg": {
        const v = vid[".mpg"] as VideoQuality[".mpg"];
        const enc = getEncodingMode(v);
        if (enc === "crf") {
          const vr = v as Extract<VideoQuality[".mpg"], { encodingMode: "crf" }>;
          return `CRF ${vr.crf}`;
        }
        const vr = v as Extract<VideoQuality[".mpg"], { encodingMode: "vbr" | "vbr-2-pass" }>;
        return `${(enc ?? "").toUpperCase()} ${vr.bitrate} kbps${vr.maxBitrate ? ` max ${vr.maxBitrate}` : ""}`;
      }
    }
  }
  return "default";
}

function summarizeParams(params: Input): string {
  const parts: string[] = [];
  // image
  if (typeof params.imageQualityPercent === "number") parts.push(`imageQuality ${params.imageQualityPercent}%`);
  if (params.webpLossless) parts.push(`webp lossless`);
  if (params.pngVariant) parts.push(`png ${params.pngVariant}`);
  if (params.tiffCompression) parts.push(`tiff ${params.tiffCompression}`);
  // audio
  if (params.audioBitrate) parts.push(`audio bitrate ${params.audioBitrate}`);
  if (typeof params.audioVbr === "boolean") parts.push(`audio vbr ${params.audioVbr ? "on" : "off"}`);
  if (params.audioProfile) parts.push(`audio profile ${params.audioProfile}`);
  if (params.audioSampleRate) parts.push(`audio sample ${params.audioSampleRate}`);
  if (params.audioBitDepth) parts.push(`audio bitDepth ${params.audioBitDepth}`);
  if (params.flacCompressionLevel) parts.push(`flac level ${params.flacCompressionLevel}`);
  // video
  if (params.videoEncodingMode) parts.push(`video mode ${params.videoEncodingMode}`);
  if (typeof params.videoCrf === "number") parts.push(`video crf ${params.videoCrf}`);
  if (params.videoBitrate) parts.push(`video bitrate ${params.videoBitrate}`);
  if (typeof params.videoMaxBitrate === "string") parts.push(`video maxBitrate ${params.videoMaxBitrate || "none"}`);
  if (params.videoPreset) parts.push(`video preset ${params.videoPreset}`);
  if (params.proresVariant) parts.push(`prores ${params.proresVariant}`);
  if (params.vp9Quality) parts.push(`vp9 ${params.vp9Quality}`);
  return parts.join(", ");
}

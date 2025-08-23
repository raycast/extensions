import { convertMedia } from "../utils/converter";
import {
  type QualitySettings,
  type QualityLevel,
  type OutputImageExtension,
  type OutputAudioExtension,
  type OutputVideoExtension,
  /* type AllOutputExtension, */
  type ImageQuality,
  type AudioQuality,
  type VideoQuality,
  getMediaType,
  DEFAULT_QUALITIES,
  // Advanced controls & helpers
  AUDIO_BITRATES,
  AUDIO_SAMPLE_RATES,
  AUDIO_BIT_DEPTH,
  AUDIO_PROFILES,
  AUDIO_COMPRESSION_LEVEL,
  VIDEO_ENCODING_MODES,
  VIDEO_BITRATE,
  VIDEO_MAX_BITRATE,
  VIDEO_PRESET,
  PRORES_VARIANTS,
  VP9_QUALITY,
  SIMPLE_QUALITY_MAPPINGS,
} from "../types/media";
import { findFFmpegPath } from "../utils/ffmpeg";
import { Tool } from "@raycast/api";
import path from "path";
import os from "os";
import fs from "fs";

async function getFullPath(inputPath: string | undefined) {
  // Validate that we actually received an input path. Safeguards against runtime errors such as
  // "Cannot read properties of undefined (reading 'replace')" when the tool is invoked without
  // an argument.
  if (!inputPath) {
    throw new Error("Input path is required but was not provided.");
  }

  const fullPath = path.resolve(path.normalize(inputPath.replace(/^~/, os.homedir())));

  if (!fs.existsSync(fullPath)) {
    throw new Error(`The file does not exist at ${fullPath}`);
  }

  return fullPath;
}

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
    | ".avif";
  // Simple mode quality (optional). If omitted, sensible defaults apply.
  quality?: QualityLevel;

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
  const {
    inputPath,
    outputFileType,
    quality,
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
  } = input;
  const installed = await findFFmpegPath();
  if (!installed) {
    return {
      type: "error",
      message: "FFmpeg is not installed. Please install FFmpeg to use this tool.",
    };
  }

  let fullPath: string;
  let mediaType: "image" | "audio" | "video" | null;

  try {
    fullPath = await getFullPath(inputPath);
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

  try {
    let outputPath: string;
    // Build quality settings with sensible defaults and advanced overrides
    const buildQualitySettings = (): QualitySettings => {
      // Default base settings for the chosen output file type
      const baseDefault = DEFAULT_QUALITIES[outputFileType as keyof typeof DEFAULT_QUALITIES] as unknown;

      if (mediaType === "image") {
        // Image defaults are always the advanced type (percentages/variants)
        const current = baseDefault as ImageQuality[OutputImageExtension];
        let value: ImageQuality[OutputImageExtension] = current as ImageQuality[OutputImageExtension];

        switch (outputFileType as OutputImageExtension) {
          case ".jpg": {
            const pct = clampPercent(imageQualityPercent);
            const next: ImageQuality[".jpg"] = (
              typeof pct === "number" ? pct : (current as ImageQuality[".jpg"])
            ) as ImageQuality[".jpg"];
            value = next as unknown as ImageQuality[OutputImageExtension];
            break;
          }
          case ".png": {
            const next: ImageQuality[".png"] = (
              pngVariant && ["png-24", "png-8"].includes(pngVariant) ? pngVariant : (current as ImageQuality[".png"])
            ) as ImageQuality[".png"];
            value = next as unknown as ImageQuality[OutputImageExtension];
            break;
          }
          case ".webp": {
            if (webpLossless) value = "lossless";
            else {
              const pct = clampPercent(imageQualityPercent);
              const next: ImageQuality[".webp"] = (
                typeof pct === "number" ? pct : (current as ImageQuality[".webp"])
              ) as ImageQuality[".webp"];
              value = next as unknown as ImageQuality[OutputImageExtension];
            }
            break;
          }
          case ".heic": {
            if (process.platform !== "darwin") {
              throw new Error("HEIC output is only supported on macOS.");
            }
            const pct = clampPercent(imageQualityPercent);
            const next: ImageQuality[".heic"] = (
              typeof pct === "number" ? pct : (current as ImageQuality[".heic"])
            ) as ImageQuality[".heic"];
            value = next as unknown as ImageQuality[OutputImageExtension];
            break;
          }
          case ".tiff": {
            const next: ImageQuality[".tiff"] = (
              tiffCompression && ["deflate", "lzw"].includes(tiffCompression)
                ? tiffCompression
                : (current as ImageQuality[".tiff"])
            ) as ImageQuality[".tiff"];
            value = next as unknown as ImageQuality[OutputImageExtension];
            break;
          }
          case ".avif": {
            const pct = clampPercent(imageQualityPercent);
            const next: ImageQuality[".avif"] = (
              typeof pct === "number" ? pct : (current as ImageQuality[".avif"])
            ) as ImageQuality[".avif"];
            value = next as unknown as ImageQuality[OutputImageExtension];
            break;
          }
        }

        return { [outputFileType]: value } as QualitySettings;
      }

      if (mediaType === "audio") {
        // If any advanced audio fields are provided, start from DEFAULT_QUALITIES and override.
        const advancedProvided =
          audioBitrate ||
          typeof audioVbr === "boolean" ||
          audioProfile ||
          audioSampleRate ||
          audioBitDepth ||
          flacCompressionLevel;

        let audioValue = (
          advancedProvided
            ? baseDefault
            : quality
              ? (SIMPLE_QUALITY_MAPPINGS[outputFileType as keyof typeof SIMPLE_QUALITY_MAPPINGS]?.[quality] ??
                baseDefault)
              : baseDefault
        ) as AudioQuality[keyof AudioQuality];

        switch (outputFileType as OutputAudioExtension) {
          case ".mp3": {
            const current = audioValue as AudioQuality[".mp3"];
            const next: AudioQuality[".mp3"] = {
              bitrate: validateOneOf(audioBitrate, AUDIO_BITRATES, current.bitrate),
              vbr: typeof audioVbr === "boolean" ? audioVbr : current.vbr,
            };
            audioValue = next;
            break;
          }
          case ".aac":
          case ".m4a": {
            const current = audioValue as AudioQuality[".aac"];
            const fallbackProfile: (typeof AUDIO_PROFILES)[number] = (current.profile ??
              "aac_low") as (typeof AUDIO_PROFILES)[number];
            const next: AudioQuality[".aac"] = {
              bitrate: validateOneOf(audioBitrate, AUDIO_BITRATES, current.bitrate),
              profile: validateOneOf(audioProfile, AUDIO_PROFILES, fallbackProfile),
            };
            audioValue = next;
            break;
          }
          case ".wav": {
            const current = audioValue as AudioQuality[".wav"];
            const next: AudioQuality[".wav"] = {
              sampleRate: validateOneOf(audioSampleRate, AUDIO_SAMPLE_RATES, current.sampleRate),
              bitDepth: validateOneOf(audioBitDepth, AUDIO_BIT_DEPTH, current.bitDepth),
            };
            audioValue = next;
            break;
          }
          case ".flac": {
            const current = audioValue as AudioQuality[".flac"];
            let bitDepth = validateOneOf(
              (audioBitDepth ?? current.bitDepth) as "16" | "24",
              ["16", "24"] as const,
              current.bitDepth,
            );
            // Coerce 32 to 24 for FLAC if provided
            if (audioBitDepth === "32") bitDepth = "24";
            const next: AudioQuality[".flac"] = {
              compressionLevel: validateOneOf(flacCompressionLevel, AUDIO_COMPRESSION_LEVEL, current.compressionLevel),
              sampleRate: validateOneOf(audioSampleRate, AUDIO_SAMPLE_RATES, current.sampleRate),
              bitDepth,
            };
            audioValue = next;
            break;
          }
        }

        return { [outputFileType]: audioValue } as QualitySettings;
      }

      if (mediaType === "video") {
        const advancedProvided =
          videoEncodingMode ||
          typeof videoCrf === "number" ||
          videoBitrate ||
          typeof videoMaxBitrate === "string" ||
          videoPreset ||
          proresVariant ||
          vp9Quality;

        let videoValue = (
          advancedProvided
            ? baseDefault
            : quality
              ? (SIMPLE_QUALITY_MAPPINGS[outputFileType as keyof typeof SIMPLE_QUALITY_MAPPINGS]?.[quality] ??
                baseDefault)
              : baseDefault
        ) as VideoQuality[keyof VideoQuality];

        switch (outputFileType as OutputVideoExtension) {
          case ".mov": {
            const current = videoValue as VideoQuality[".mov"];
            const next: VideoQuality[".mov"] = {
              variant: validateOneOf(proresVariant, PRORES_VARIANTS, current.variant),
            };
            videoValue = next;
            break;
          }
          case ".webm": {
            const current = videoValue as VideoQuality[".webm"]; // has either crf or vbr variant + quality
            const mode = validateOneOf(
              videoEncodingMode,
              VIDEO_ENCODING_MODES,
              (current as Extract<VideoQuality[".webm"], { encodingMode: "crf" | "vbr" | "vbr-2-pass" }>)
                .encodingMode ?? "crf",
            );
            if (mode === "crf") {
              const currentCrf = (current as Extract<VideoQuality[".webm"], { encodingMode: "crf" }>).crf;
              videoValue = {
                encodingMode: "crf",
                crf: clampPercent(videoCrf) ?? currentCrf,
                quality: validateOneOf(
                  vp9Quality,
                  VP9_QUALITY,
                  (current as Extract<VideoQuality[".webm"], { encodingMode: "crf" }>).quality ?? "good",
                ),
              } as VideoQuality[".webm"];
            } else {
              // Use sensible defaults instead of reading from current when switching modes
              const defBitrate: (typeof VIDEO_BITRATE)[number] = "2000";
              const defMax: (typeof VIDEO_MAX_BITRATE)[number] = "";
              const defQuality: (typeof VP9_QUALITY)[number] = "good";
              videoValue = {
                encodingMode: mode,
                bitrate: validateOneOf(videoBitrate, VIDEO_BITRATE, defBitrate),
                maxBitrate: validateOneOf(videoMaxBitrate, VIDEO_MAX_BITRATE, defMax),
                quality: validateOneOf(vp9Quality, VP9_QUALITY, defQuality),
              } as VideoQuality[".webm"];
            }
            break;
          }
          case ".mp4":
          case ".mkv": {
            const current = videoValue as VideoQuality[".mp4"] | VideoQuality[".mkv"] as
              | VideoQuality[".mp4"]
              | VideoQuality[".mkv"];
            const mode = validateOneOf(
              videoEncodingMode,
              VIDEO_ENCODING_MODES,
              (
                current as Extract<
                  VideoQuality[".mp4"] | VideoQuality[".mkv"],
                  { encodingMode: "crf" | "vbr" | "vbr-2-pass" }
                >
              ).encodingMode ?? "crf",
            );
            if (mode === "crf") {
              const currentCrf = (current as Extract<VideoQuality[".mp4"] | VideoQuality[".mkv"], { crf: number }>).crf;
              const currentPreset =
                (current as Extract<VideoQuality[".mp4"] | VideoQuality[".mkv"], { preset?: unknown }>).preset ??
                "medium";
              videoValue = {
                encodingMode: "crf",
                crf: clampPercent(videoCrf) ?? currentCrf,
                preset: validateOneOf(videoPreset, VIDEO_PRESET, currentPreset),
              } as unknown as VideoQuality[".mp4"] | VideoQuality[".mkv"];
            } else {
              const defBitrate: (typeof VIDEO_BITRATE)[number] = "2000";
              const defMax: (typeof VIDEO_MAX_BITRATE)[number] = "";
              const defPreset: (typeof VIDEO_PRESET)[number] = "medium";
              videoValue = {
                encodingMode: mode,
                bitrate: validateOneOf(videoBitrate, VIDEO_BITRATE, defBitrate),
                maxBitrate: validateOneOf(videoMaxBitrate, VIDEO_MAX_BITRATE, defMax),
                preset: validateOneOf(videoPreset, VIDEO_PRESET, defPreset),
              } as unknown as VideoQuality[".mp4"] | VideoQuality[".mkv"];
            }
            break;
          }
          case ".avi":
          case ".mpg": {
            const current = videoValue as VideoQuality[".avi"] | VideoQuality[".mpg"] as
              | VideoQuality[".avi"]
              | VideoQuality[".mpg"];
            const mode = validateOneOf(
              videoEncodingMode,
              VIDEO_ENCODING_MODES,
              (
                current as Extract<
                  VideoQuality[".avi"] | VideoQuality[".mpg"],
                  { encodingMode: "crf" | "vbr" | "vbr-2-pass" }
                >
              ).encodingMode ?? "crf",
            );
            if (mode === "crf") {
              const currentCrf = (current as Extract<VideoQuality[".avi"] | VideoQuality[".mpg"], { crf: number }>).crf;
              videoValue = {
                encodingMode: "crf",
                crf: clampPercent(videoCrf) ?? currentCrf,
              } as unknown as VideoQuality[".avi"] | VideoQuality[".mpg"];
            } else {
              const defBitrate: (typeof VIDEO_BITRATE)[number] = "2000";
              const defMax: (typeof VIDEO_MAX_BITRATE)[number] = "";
              videoValue = {
                encodingMode: mode,
                bitrate: validateOneOf(videoBitrate, VIDEO_BITRATE, defBitrate),
                maxBitrate: validateOneOf(videoMaxBitrate, VIDEO_MAX_BITRATE, defMax),
              } as unknown as VideoQuality[".avi"] | VideoQuality[".mpg"];
            }
            break;
          }
        }

        return { [outputFileType]: videoValue } as QualitySettings;
      }

      // Fallback, should not reach
      throw new Error("Unsupported media type for quality building");
    };

    const qualitySettings = buildQualitySettings();

    if (mediaType === "image") {
      outputPath = await convertMedia(
        fullPath,
        outputFileType as OutputImageExtension,
        qualitySettings as ImageQuality,
      );
    } else if (mediaType === "audio") {
      outputPath = await convertMedia(
        fullPath,
        outputFileType as OutputAudioExtension,
        qualitySettings as AudioQuality,
      );
    } else if (mediaType === "video") {
      outputPath = await convertMedia(
        fullPath,
        outputFileType as OutputVideoExtension,
        qualitySettings as VideoQuality,
      );
    } else {
      return {
        type: "error",
        message: `Cannot convert ${mediaType} to ${outputFileType}. Invalid conversion pair.`,
      };
    }

    const settingsSummary = summarizeSettings(mediaType, outputFileType, qualitySettings);
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

export const confirmation: Tool.Confirmation<Input> = async (params: Input) => {
  try {
    const fullPath = await getFullPath(params.inputPath);
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

function clampPercent(value: number | undefined): number | undefined {
  if (typeof value !== "number" || Number.isNaN(value)) return undefined;
  return Math.min(100, Math.max(0, Math.round(value)));
}

function validateOneOf<T extends readonly (string | number)[]>(
  value: T[number] | undefined,
  allowed: T,
  fallback: T[number],
): T[number] {
  if (value !== undefined && (allowed as readonly (string | number)[]).includes(value as string | number)) {
    return value as T[number];
  }
  return fallback;
}

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
        if (v.encodingMode === "crf") {
          return `CRF ${v.crf}, VP9 ${v.quality}`;
        }
        return `${v.encodingMode.toUpperCase()} ${v.bitrate} kbps${v.maxBitrate ? ` max ${v.maxBitrate}` : ""}, VP9 ${v.quality}`;
      }
      case ".mp4": {
        const v = vid[".mp4"] as VideoQuality[".mp4"];
        if (v.encodingMode === "crf") {
          return `CRF ${v.crf}, preset ${v.preset}`;
        }
        return `${v.encodingMode.toUpperCase()} ${v.bitrate} kbps${v.maxBitrate ? ` max ${v.maxBitrate}` : ""}, preset ${v.preset}`;
      }
      case ".mkv": {
        const v = vid[".mkv"] as VideoQuality[".mkv"];
        if (v.encodingMode === "crf") {
          return `CRF ${v.crf}, preset ${v.preset}`;
        }
        return `${v.encodingMode.toUpperCase()} ${v.bitrate} kbps${v.maxBitrate ? ` max ${v.maxBitrate}` : ""}, preset ${v.preset}`;
      }
      case ".avi": {
        const v = vid[".avi"] as VideoQuality[".avi"];
        if (v.encodingMode === "crf") {
          return `CRF ${v.crf}`;
        }
        return `${v.encodingMode.toUpperCase()} ${v.bitrate} kbps${v.maxBitrate ? ` max ${v.maxBitrate}` : ""}`;
      }
      case ".mpg": {
        const v = vid[".mpg"] as VideoQuality[".mpg"];
        if (v.encodingMode === "crf") {
          return `CRF ${v.crf}`;
        }
        return `${v.encodingMode.toUpperCase()} ${v.bitrate} kbps${v.maxBitrate ? ` max ${v.maxBitrate}` : ""}`;
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

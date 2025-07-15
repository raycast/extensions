import { convertMedia } from "../utils/converter";
import {
  INPUT_IMAGE_EXTENSIONS,
  INPUT_AUDIO_EXTENSIONS,
  INPUT_VIDEO_EXTENSIONS,
  type QualitySettings,
  type QualityLevel,
  type OutputImageExtension,
  type OutputAudioExtension,
  type OutputVideoExtension,
  /* type AllOutputExtension, */
  type ImageQuality,
  type AudioQuality,
  type VideoQuality,
  DEFAULT_QUALITIES,
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

function getMediaType(filePath: string): "image" | "audio" | "video" | null {
  const extension = path.extname(filePath).toLowerCase();
  if (INPUT_IMAGE_EXTENSIONS.includes(extension as (typeof INPUT_IMAGE_EXTENSIONS)[number])) return "image";
  if (INPUT_AUDIO_EXTENSIONS.includes(extension as (typeof INPUT_AUDIO_EXTENSIONS)[number])) return "audio";
  if (INPUT_VIDEO_EXTENSIONS.includes(extension as (typeof INPUT_VIDEO_EXTENSIONS)[number])) return "video";
  return null;
}

function getQualitySettings(outputFormat: string, qualityLevel: QualityLevel): QualitySettings {
  // For most formats, we'll use presets based on quality level
  switch (outputFormat) {
    // Image formats
    case ".jpg":
    case ".heic":
    case ".avif":
      return {
        [outputFormat]: qualityLevel === "low" ? 60 : qualityLevel === "medium" ? 80 : 95,
      } as unknown as ImageQuality;

    case ".webp":
      if (qualityLevel === "lossless") {
        return { ".webp": "lossless" } as ImageQuality;
      }
      return { ".webp": qualityLevel === "low" ? 60 : qualityLevel === "medium" ? 80 : 95 } as ImageQuality;

    case ".png":
      return { ".png": "png-24" } as ImageQuality;

    case ".tiff":
      return { ".tiff": "deflate" } as ImageQuality;

    // Audio formats
    case ".mp3":
      return {
        ".mp3": { bitrate: qualityLevel === "low" ? "128" : qualityLevel === "medium" ? "192" : "320", vbr: true },
      } as AudioQuality;

    case ".aac":
    case ".m4a":
      return {
        [outputFormat]: {
          bitrate: qualityLevel === "low" ? "128" : qualityLevel === "medium" ? "192" : "320",
          profile: "aac_low",
        },
      } as unknown as AudioQuality;

    case ".wav":
      return {
        ".wav": {
          sampleRate: qualityLevel === "lossless" ? "48000" : "44100",
          bitDepth: qualityLevel === "lossless" ? "24" : "16",
        },
      } as AudioQuality;

    case ".flac":
      return {
        ".flac": {
          compressionLevel: qualityLevel === "low" ? "3" : qualityLevel === "medium" ? "5" : "8",
          sampleRate: qualityLevel === "lossless" ? "48000" : "44100",
          bitDepth: qualityLevel === "lossless" ? "24" : "16",
        },
      } as AudioQuality;

    // Video formats
    case ".mp4":
      return {
        ".mp4": {
          encodingMode: "crf",
          crf: qualityLevel === "low" ? 28 : qualityLevel === "medium" ? 23 : 18,
          preset: qualityLevel === "low" ? "fast" : qualityLevel === "medium" ? "medium" : "slow",
        },
      } as VideoQuality;

    case ".mkv":
      return {
        ".mkv": {
          encodingMode: "crf",
          crf: qualityLevel === "low" ? 28 : qualityLevel === "medium" ? 23 : 18,
          preset: qualityLevel === "low" ? "fast" : qualityLevel === "medium" ? "medium" : "slow",
        },
      } as VideoQuality;

    case ".avi":
      return {
        ".avi": { encodingMode: "crf", crf: qualityLevel === "low" ? 28 : qualityLevel === "medium" ? 23 : 18 },
      } as VideoQuality;

    case ".mov":
      return {
        ".mov": { variant: qualityLevel === "low" ? "proxy" : qualityLevel === "medium" ? "standard" : "hq" },
      } as VideoQuality;

    case ".mpg":
      return {
        ".mpg": { encodingMode: "crf", crf: qualityLevel === "low" ? 28 : qualityLevel === "medium" ? 23 : 18 },
      } as VideoQuality;

    case ".webm":
      return {
        ".webm": {
          encodingMode: "crf",
          crf: qualityLevel === "low" ? 35 : qualityLevel === "medium" ? 30 : 25,
          quality: qualityLevel === "high" ? "best" : "good",
        },
      } as VideoQuality;

    default:
      // Fallback to default quality from the constants
      return {
        [outputFormat]: DEFAULT_QUALITIES[outputFormat as keyof typeof DEFAULT_QUALITIES],
      } as unknown as QualitySettings;
  }
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
    // IMAGE
    | ".jpg"
    | ".png"
    | ".webp"
    | ".heic"
    | ".tiff"
    | ".avif";
  quality: QualityLevel;
};

export default async function ConvertMedia({ inputPath, outputFileType, quality }: Input) {
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
    mediaType = getMediaType(fullPath);

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
    const qualitySettings = getQualitySettings(outputFileType, quality);

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

    return {
      type: "success",
      message: `The ${mediaType} was converted successfully. Converted file path: ${outputPath}`,
    };
  } catch (error) {
    console.error(error);
    return {
      type: "error",
      message: `The ${mediaType} could not be converted. Error: ${error}`,
    };
  }
}

export const confirmation: Tool.Confirmation<Input> = async ({ inputPath, outputFileType, quality }: Input) => {
  try {
    const fullPath = await getFullPath(inputPath);
    const mediaType = getMediaType(fullPath);
    const message = "This will create a new file in the same directory.";
    const info = [
      { name: "Input Path", value: fullPath },
      { name: "Input Media Type", value: mediaType || "Unknown" },
      { name: "Output File Type", value: outputFileType },
      { name: "Quality", value: String(quality) },
    ];

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

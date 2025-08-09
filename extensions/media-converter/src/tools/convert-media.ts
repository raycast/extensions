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
  quality: QualityLevel;
};

export default async function ConvertMedia({ inputPath, outputFileType }: Input) {
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
    const qualitySettings = {
      [outputFileType]: DEFAULT_QUALITIES[outputFileType],
    } as QualitySettings;

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
    const mediaType = getMediaType(path.extname(fullPath));
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

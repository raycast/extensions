import { execFile } from "child_process";
import { promisify } from "util";
import path from "path";
import fs from "fs";
import { ResizePreset, ProcessingResult, OperationStage, ProgressCallback } from "./types";

const execFileAsync = promisify(execFile);

// Import getFfmpegPath from compression module
let getFfmpegPathFunc: (() => string) | null = null;

/**
 * Lazy load getFfmpegPath to avoid circular dependencies
 */
function getFfmpegPath(): string {
  if (!getFfmpegPathFunc) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const compressionModule = require("./compression");
    getFfmpegPathFunc = compressionModule.getFfmpegPath;
  }
  return getFfmpegPathFunc ? getFfmpegPathFunc() : "ffmpeg";
}

/**
 * Resize an image using ffmpeg
 * Using ffmpeg instead of Sharp to avoid native module issues in Raycast
 */
export async function resizeImage(
  inputPath: string,
  preset: ResizePreset,
  progressCallback?: ProgressCallback,
): Promise<ProcessingResult> {
  try {
    progressCallback?.(OperationStage.Analyzing, 10, "Reading image metadata");

    const stats = fs.statSync(inputPath);
    const originalSize = stats.size;

    const ext = path.extname(inputPath).toLowerCase();
    const dir = path.dirname(inputPath);
    const basename = path.basename(inputPath, ext);
    const outputPath = path.join(dir, `${basename}.resized.webp`);

    const ffmpegPath = getFfmpegPath();

    progressCallback?.(OperationStage.Resizing, 30, `Resizing to ${preset.description}`);

    // Build scale filter for ffmpeg
    let scaleFilter = "";
    if (preset.maxWidth && preset.maxHeight) {
      // Max dimension mode - fit within bounds while maintaining aspect ratio
      scaleFilter = `scale='min(${preset.maxWidth},iw)':'min(${preset.maxHeight},ih)':force_original_aspect_ratio=decrease`;
    } else if (preset.width && preset.height) {
      // Exact dimension mode - scale to exact size with aspect ratio preservation
      scaleFilter = `scale=${preset.width}:${preset.height}:force_original_aspect_ratio=decrease`;
    }

    progressCallback?.(OperationStage.Resizing, 60, "Processing image");

    // Use ffmpeg to resize and convert to WebP
    await execFileAsync(
      ffmpegPath,
      [
        "-i",
        inputPath,
        "-vf",
        scaleFilter,
        "-c:v",
        "libwebp",
        "-quality",
        "85",
        "-compression_level",
        "4",
        "-y",
        outputPath,
      ],
      {
        maxBuffer: 10 * 1024 * 1024,
        windowsHide: process.platform === "win32",
      },
    );

    progressCallback?.(OperationStage.Finalizing, 90, "Saving resized image");

    if (!fs.existsSync(outputPath)) {
      throw new Error("Output file not created");
    }

    const processedStats = fs.statSync(outputPath);
    const processedSize = processedStats.size;

    progressCallback?.(OperationStage.Finalizing, 100, "Complete");

    return {
      success: true,
      outputPath,
      originalSize,
      processedSize,
      fileName: path.basename(outputPath),
      fileType: "image",
    };
  } catch (error) {
    let errorMessage = error instanceof Error ? error.message : "Unknown error during image resize";

    if (errorMessage.includes("spawn") || errorMessage.includes("ENOENT")) {
      errorMessage = `FFmpeg not found. ${errorMessage}`;
    }

    return {
      success: false,
      error: errorMessage,
      fileName: path.basename(inputPath),
      fileType: "image",
    };
  }
}

/**
 * Resize a video using ffmpeg
 */
export async function resizeVideo(
  inputPath: string,
  preset: ResizePreset,
  progressCallback?: ProgressCallback,
): Promise<ProcessingResult> {
  try {
    progressCallback?.(OperationStage.Analyzing, 10, "Reading video metadata");

    const stats = fs.statSync(inputPath);
    const originalSize = stats.size;

    const ext = path.extname(inputPath).toLowerCase();
    const dir = path.dirname(inputPath);
    const basename = path.basename(inputPath, ext);
    const outputPath = path.join(dir, `${basename}.resized.mp4`);

    const ffmpegPath = getFfmpegPath();

    progressCallback?.(OperationStage.Resizing, 30, `Resizing to ${preset.description}`);

    // Build scale filter
    let scaleFilter = "";
    if (preset.width && preset.height) {
      // Exact dimensions with aspect ratio preservation
      scaleFilter = `scale=${preset.width}:${preset.height}:force_original_aspect_ratio=decrease,pad=${preset.width}:${preset.height}:(ow-iw)/2:(oh-ih)/2`;
    } else if (preset.maxWidth && preset.maxHeight) {
      // Max dimension mode
      scaleFilter = `scale='min(${preset.maxWidth},iw)':'min(${preset.maxHeight},ih)':force_original_aspect_ratio=decrease`;
    }

    progressCallback?.(OperationStage.Resizing, 50, "Processing video");

    // Use ffmpeg to resize video
    await execFileAsync(
      ffmpegPath,
      [
        "-i",
        inputPath,
        "-vf",
        scaleFilter,
        "-c:v",
        "libx264",
        "-preset",
        "medium",
        "-crf",
        "23",
        "-c:a",
        "aac",
        "-b:a",
        "128k",
        "-movflags",
        "+faststart",
        "-y",
        outputPath,
      ],
      {
        maxBuffer: 50 * 1024 * 1024,
        windowsHide: process.platform === "win32",
      },
    );

    progressCallback?.(OperationStage.Finalizing, 90, "Saving resized video");

    if (!fs.existsSync(outputPath)) {
      throw new Error("Output file not created");
    }

    const processedStats = fs.statSync(outputPath);
    const processedSize = processedStats.size;

    progressCallback?.(OperationStage.Finalizing, 100, "Complete");

    return {
      success: true,
      outputPath,
      originalSize,
      processedSize,
      fileName: path.basename(outputPath),
      fileType: "video",
    };
  } catch (error) {
    let errorMessage = error instanceof Error ? error.message : "Unknown error during video resize";

    if (errorMessage.includes("spawn") || errorMessage.includes("ENOENT")) {
      errorMessage = `FFmpeg not found. ${errorMessage}`;
    }

    return {
      success: false,
      error: errorMessage,
      fileName: path.basename(inputPath),
      fileType: "video",
    };
  }
}

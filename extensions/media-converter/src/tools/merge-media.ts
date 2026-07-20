import type { Tool } from "@raycast/api";
import path from "path";
import os from "os";
import fs from "fs";
import { mergeMedia } from "../utils/merge";
import { findFFmpegPath } from "../utils/ffmpeg";
import { AllOutputExtension, getOutputCategory } from "../types/media";

type Input = {
  /**
   * Absolute paths of the files to merge, separated by newlines ("\n"). Must contain at least 2 paths.
   * Inputs are concatenated in the order provided.
   */
  inputPaths: string;
  outputFileType: ".mp4" | ".avi" | ".mov" | ".mkv" | ".mpg" | ".webm" | ".mp3" | ".aac" | ".wav" | ".flac" | ".m4a";
  /** Absolute path to output folder. Defaults to the folder of the first input. */
  outputDir?: string;
  /** Bare filename without extension. Defaults to "merged". */
  outputFileName?: string;
  /** Remove EXIF/GPS/tags from the merged output. */
  stripMetadata?: boolean;
  /** When true, always re-encode instead of trying fast stream-copy. */
  forceReencode?: boolean;
};

function resolvePath(p: string): string {
  return path.resolve(path.normalize(p.replace(/^~/, os.homedir())));
}

function parseInputPaths(raw: string): string[] {
  return raw
    .split(/\r?\n|\|{2,}/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);
}

export default async function MergeMediaTool(input: Input) {
  const ffmpeg = await findFFmpegPath();
  if (!ffmpeg) {
    return { type: "error", message: "FFmpeg is not installed or configured." };
  }

  const rawPaths = parseInputPaths(input.inputPaths ?? "");
  if (rawPaths.length < 2) {
    return { type: "error", message: "At least 2 input paths are required to merge. Separate paths with newlines." };
  }

  const absoluteInputs = rawPaths.map(resolvePath);
  for (const p of absoluteInputs) {
    if (!fs.existsSync(p)) {
      return { type: "error", message: `File does not exist: ${p}` };
    }
  }

  const outputCategory = getOutputCategory(input.outputFileType as AllOutputExtension);
  if (outputCategory !== "video" && outputCategory !== "audio") {
    return { type: "error", message: `Output format ${input.outputFileType} is not valid for merging.` };
  }

  // Validate optional output directory to provide a clear error message early
  let resolvedOutputDir: string | undefined;
  if (input.outputDir) {
    resolvedOutputDir = resolvePath(input.outputDir);
    try {
      const stat = fs.statSync(resolvedOutputDir);
      if (!stat.isDirectory()) {
        return { type: "error", message: `Output path is not a directory: ${resolvedOutputDir}` };
      }
    } catch {
      return { type: "error", message: `Output directory does not exist: ${resolvedOutputDir}` };
    }
  }

  try {
    const result = await mergeMedia(absoluteInputs, input.outputFileType as AllOutputExtension, {
      outputDir: resolvedOutputDir,
      outputFileName: input.outputFileName,
      stripMetadata: input.stripMetadata,
      forceReencode: input.forceReencode,
    });
    return {
      type: "success",
      message: `Merged ${absoluteInputs.length} files into ${result.outputPath} (${result.strategy})`,
    };
  } catch (error) {
    return { type: "error", message: `Merge failed: ${String(error)}` };
  }
}

export const confirmation: Tool.Confirmation<Input> = async (params: Input) => {
  const paths = parseInputPaths(params.inputPaths ?? "");
  const info: { name: string; value: string }[] = [
    { name: "Files", value: `${paths.length} inputs` },
    { name: "Output Format", value: params.outputFileType },
  ];
  if (paths.length > 0) {
    info.push({ name: "First file", value: paths[0] });
    info.push({ name: "Last file", value: paths[paths.length - 1] });
  }
  if (params.outputFileName) info.push({ name: "Output Name", value: params.outputFileName });
  if (params.outputDir) info.push({ name: "Output Folder", value: params.outputDir });
  if (params.stripMetadata) info.push({ name: "Strip Metadata", value: "yes" });
  if (params.forceReencode) info.push({ name: "Force Re-encode", value: "yes" });
  return {
    message: "This will create a new merged file from the inputs in the given order.",
    info,
  };
};

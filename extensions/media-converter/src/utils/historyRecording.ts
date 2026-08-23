import fs from "node:fs";
import path from "node:path";
import { appendHistory } from "./history";
import {
  getMediaType,
  type AllOutputExtension,
  type MediaType,
  type QualitySettings,
  type TrimOptions,
} from "../types/media";

function sizeOf(filePath: string): number {
  try {
    return fs.statSync(filePath).size;
  } catch {
    return 0;
  }
}

export async function recordConversionHistory(params: {
  input: string;
  output: string;
  outputFormat: AllOutputExtension;
  quality: QualitySettings;
  mediaType: MediaType | "gif";
  trim?: TrimOptions;
  stripMetadata?: boolean;
  outputDir?: string;
  durationMs: number;
}): Promise<void> {
  await appendHistory({
    operation: "convert",
    inputs: [params.input],
    outputs: [params.output],
    outputFormat: params.outputFormat,
    quality: params.quality,
    mediaType: params.mediaType,
    trim: params.trim,
    stripMetadata: params.stripMetadata,
    outputDir: params.outputDir,
    durationMs: params.durationMs,
    inputBytes: sizeOf(params.input),
    outputBytes: sizeOf(params.output),
  });
}

export async function recordMergeHistory(params: {
  inputs: string[];
  output: string;
  outputFormat: AllOutputExtension;
  stripMetadata?: boolean;
  outputDir?: string;
  durationMs: number;
}): Promise<void> {
  const category = path.extname(params.output).toLowerCase();
  const mediaType: MediaType = [".mp3", ".aac", ".wav", ".flac", ".m4a"].includes(category) ? "audio" : "video";
  await appendHistory({
    operation: "merge",
    inputs: params.inputs,
    outputs: [params.output],
    outputFormat: params.outputFormat,
    mediaType,
    stripMetadata: params.stripMetadata,
    outputDir: params.outputDir,
    durationMs: params.durationMs,
    inputBytes: params.inputs.reduce((sum, input) => sum + sizeOf(input), 0),
    outputBytes: sizeOf(params.output),
  });
}

export async function recordEditHistory(params: {
  input: string;
  output: string;
  outputFormat: AllOutputExtension;
  durationMs: number;
}): Promise<void> {
  const mediaType = getMediaType(path.extname(params.output)) ?? getMediaType(path.extname(params.input)) ?? "video";
  await appendHistory({
    operation: "edit",
    inputs: [params.input],
    outputs: [params.output],
    outputFormat: params.outputFormat,
    mediaType,
    durationMs: params.durationMs,
    inputBytes: sizeOf(params.input),
    outputBytes: sizeOf(params.output),
  });
}

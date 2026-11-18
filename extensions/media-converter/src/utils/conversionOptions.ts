import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { parseTimeString } from "./time";
import type { TrimOptions } from "../types/media";

export type TrimResolution = {
  trim?: TrimOptions;
  error?: string;
  startSec?: number;
  endSec?: number;
};

export function resolveTrim(start?: string, end?: string): TrimResolution {
  const startValue = start?.trim() ?? "";
  const endValue = end?.trim() ?? "";
  const startSec = startValue ? parseTimeString(startValue) : null;
  const endSec = endValue ? parseTimeString(endValue) : null;

  if (startValue && startSec === null) return { error: "Start time is not a valid HH:MM:SS or seconds value" };
  if (endValue && endSec === null) return { error: "End time is not a valid HH:MM:SS or seconds value" };
  if (startSec !== null && endSec !== null && endSec <= startSec) {
    return { error: "End time must be after start time" };
  }
  if (!startValue && !endValue) return {};
  return {
    trim: { start: startValue || undefined, end: endValue || undefined },
    startSec: startSec ?? undefined,
    endSec: endSec ?? undefined,
  };
}

export function resolveExistingDirectory(raw?: string): { path?: string; error?: string } {
  const value = raw?.trim();
  if (!value) return {};
  const resolved = path.resolve(path.normalize(value.replace(/^~(?=$|[\\/])/, os.homedir())));
  try {
    const stat = fs.statSync(resolved);
    if (!stat.isDirectory()) return { error: `Output path is not a directory: ${resolved}` };
    return { path: resolved };
  } catch {
    return { error: `Output directory does not exist: ${resolved}` };
  }
}

export function resolveExistingFile(raw?: string): { path?: string; error?: string } {
  if (!raw) return { error: "Input path is required but was not provided." };
  const resolved = path.resolve(path.normalize(raw.replace(/^~(?=$|[\\/])/, os.homedir())));
  try {
    if (!fs.statSync(resolved).isFile()) return { error: `Input path is not a file: ${resolved}` };
    return { path: resolved };
  } catch {
    return { error: `The file does not exist at ${resolved}` };
  }
}

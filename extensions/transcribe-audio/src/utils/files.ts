import { access, constants } from "fs/promises";
import { join, parse } from "path";
import { getSelectedFinderItems } from "@raycast/api";
import { isSupportedMediaFile } from "./audio";

export function getSiblingPath(filePath: string, suffix: string): string {
  const { dir, name } = parse(filePath);
  return join(dir, `${name}${suffix}`);
}

export async function uniqueSiblingPath(filePath: string, suffix: string): Promise<string> {
  const initialPath = getSiblingPath(filePath, suffix);
  try {
    await access(initialPath, constants.F_OK);
  } catch {
    return initialPath;
  }

  const { dir, name, ext } = parse(initialPath);
  for (let i = 1; i < 100; i++) {
    const candidate = join(dir, `${name} (${i})${ext}`);
    try {
      await access(candidate, constants.F_OK);
    } catch {
      return candidate;
    }
  }

  throw new Error("Could not find a unique transcript filename.");
}

export async function pickAudioFileFromFinder(): Promise<string | undefined> {
  try {
    const selected = await getSelectedFinderItems();
    const mediaFile = selected.find((item) => isSupportedMediaFile(item.path));
    return mediaFile?.path;
  } catch {
    return undefined;
  }
}

export function fileNameWithoutExtension(filePath: string): string {
  const parts = filePath.split("/");
  const base = parts[parts.length - 1] || filePath;
  const dotIndex = base.lastIndexOf(".");
  return dotIndex > 0 ? base.slice(0, dotIndex) : base;
}

export function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9\-_.\s]/g, "_").trim();
}

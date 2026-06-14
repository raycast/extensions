import * as path from "path";
import * as fs from "fs";
import { execSync } from "child_process";

export type FileCategory = "video" | "audio" | "image" | "document" | "unknown";

const FORMAT_MAP: Record<FileCategory, string[]> = {
  video: ["mp4", "mkv", "mov", "avi", "webm", "gif"],
  audio: ["mp3", "wav", "aac", "flac", "ogg", "m4a"],
  image: ["jpg", "png", "webp", "gif", "bmp", "tiff", "avif"],
  document: ["pdf", "docx", "html", "md", "txt", "epub"],
  unknown: [],
};

const EXT_TO_CATEGORY: Record<string, FileCategory> = {};
for (const [cat, exts] of Object.entries(FORMAT_MAP)) {
  for (const ext of exts) {
    EXT_TO_CATEGORY[ext] = cat as FileCategory;
  }
}

export function getCategory(filePath: string): FileCategory {
  const ext = path.extname(filePath).replace(".", "").toLowerCase();
  return EXT_TO_CATEGORY[ext] ?? "unknown";
}

export function getTargetFormats(
  category: FileCategory,
  sourceExt: string,
): string[] {
  return (FORMAT_MAP[category] ?? []).filter(
    (f) => f !== sourceExt.toLowerCase(),
  );
}

export function buildOutputPath(inputPath: string, targetExt: string): string {
  const dir = path.dirname(inputPath);
  const base = path.basename(inputPath, path.extname(inputPath));
  let candidate = path.join(dir, `${base}.${targetExt}`);
  // Avoid silently overwriting an existing file: append " (n)" on collision,
  // mirroring Finder's behaviour. Clean name is kept when there is no conflict.
  let counter = 1;
  while (fs.existsSync(candidate)) {
    candidate = path.join(dir, `${base} (${counter}).${targetExt}`);
    counter++;
  }
  return candidate;
}

export function findBinary(name: string): string {
  try {
    return execSync(`which ${name}`, { encoding: "utf8" }).trim();
  } catch {
    const fallbacks = [`/opt/homebrew/bin/${name}`, `/usr/local/bin/${name}`];
    for (const p of fallbacks) {
      if (fs.existsSync(p)) return p;
    }
    throw new Error(`${name} not found. Install it with: brew install ${name}`);
  }
}

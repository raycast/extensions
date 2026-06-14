import * as path from "path";

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
  return path.join(dir, `${base}.${targetExt}`);
}

export function buildCommand(
  inputPath: string,
  outputPath: string,
  category: FileCategory,
): string {
  const esc = (p: string) => `"${p}"`;

  switch (category) {
    case "video":
    case "audio":
      return `/opt/homebrew/bin/ffmpeg -y -i ${esc(inputPath)} ${esc(outputPath)}`;
    case "image":
      return `/opt/homebrew/bin/magick ${esc(inputPath)} ${esc(outputPath)}`;
    case "document":
      return `/opt/homebrew/bin/pandoc ${esc(inputPath)} -o ${esc(outputPath)}`;
    default:
      throw new Error("Format non supporté");
  }
}

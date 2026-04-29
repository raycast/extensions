import { promises as fs } from "fs";
import os from "os";
import path from "path";
import sanitizeFilename from "sanitize-filename";
import type { ConvertPreferences } from "./convert";
import { slugify } from "./slug";

export async function saveMarkdownToFile(options: {
  title?: string;
  markdown: string;
  url: string;
  preferences: ConvertPreferences;
}): Promise<string> {
  const { title, markdown, preferences } = options;

  const outputDirectory = resolveOutputDirectory(preferences.outputDirectory);
  await fs.mkdir(outputDirectory, { recursive: true });

  const baseName = buildBaseFilename(title, preferences.fileNameStyle);
  const filePath = await ensureUniquePath(
    path.join(outputDirectory, `${baseName}.md`),
  );

  await fs.writeFile(filePath, markdown, "utf8");
  return filePath;
}

function resolveOutputDirectory(preferenceValue?: string): string {
  const defaultDownloads = path.join(os.homedir(), "Downloads");
  const dir = (preferenceValue ?? "").trim();
  if (!dir) return defaultDownloads;

  if (dir === "~") return os.homedir();
  if (dir.startsWith("~/")) return path.join(os.homedir(), dir.slice(2));
  return dir;
}

function buildBaseFilename(title: string | undefined, style?: string): string {
  const safeTitle = title ? slugify(title) : "";
  const now = new Date();
  const date = now.toISOString().slice(0, 10);

  const raw =
    style === "date-title-slug"
      ? `${date}-${safeTitle || "webpage"}`
      : `${safeTitle || `webpage-${date}-${now.toISOString().slice(11, 19).replace(/:/g, "")}`}`;

  const sanitized = sanitizeFilename(raw)
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return sanitized || `webpage-${date}`;
}

async function ensureUniquePath(initialPath: string): Promise<string> {
  const ext = path.extname(initialPath);
  const base = initialPath.slice(0, -ext.length);

  let candidate = initialPath;
  for (let i = 2; i < 1000; i++) {
    try {
      await fs.access(candidate);
      candidate = `${base}-${i}${ext}`;
    } catch {
      return candidate;
    }
  }

  // Extremely unlikely, but keep it bounded.
  return `${base}-${Date.now()}${ext}`;
}

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
  const { title, markdown, url, preferences } = options;

  const outputDirectory = resolveOutputDirectory(preferences.outputDirectory);
  await fs.mkdir(outputDirectory, { recursive: true });

  const baseName = buildBaseFilename(title, url, preferences.fileNameStyle);
  return writeWithoutOverwriting(path.join(outputDirectory, `${baseName}.md`), markdown);
}

function resolveOutputDirectory(preferenceValue?: string): string {
  const defaultDownloads = path.join(os.homedir(), "Downloads");
  const dir = (preferenceValue ?? "").trim();
  if (!dir) return defaultDownloads;

  if (dir === "~") return os.homedir();
  if (dir.startsWith("~/")) return path.join(os.homedir(), dir.slice(2));
  return dir;
}

function buildBaseFilename(title: string | undefined, url: string, style?: string): string {
  // Fall back to the URL before resorting to a timestamp — "example-com-my-post"
  // is far more useful than "webpage-2026-07-26-163655".
  const safeTitle = (title ? slugify(title) : "") || slugifyUrl(url);
  const now = new Date();
  const date = now.toISOString().slice(0, 10);

  const raw =
    style === "date-title-slug"
      ? `${date}-${safeTitle || "webpage"}`
      : `${safeTitle || `webpage-${date}-${now.toISOString().slice(11, 19).replace(/:/g, "")}`}`;

  const sanitized = sanitizeFilename(raw).replace(/\s+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
  return sanitized || `webpage-${date}`;
}

function slugifyUrl(url: string): string {
  try {
    const { hostname, pathname } = new URL(url);
    return slugify(`${hostname}${pathname}`);
  } catch {
    return "";
  }
}

/**
 * Writes to the first free `name.md` / `name-2.md` / … path. Uses an exclusive
 * create rather than checking existence first, so two saves racing on the same
 * title cannot both resolve to the same path and silently lose one file.
 */
async function writeWithoutOverwriting(initialPath: string, markdown: string): Promise<string> {
  const ext = path.extname(initialPath);
  const base = initialPath.slice(0, -ext.length);

  for (let i = 1; i <= 1000; i++) {
    const candidate = i === 1 ? initialPath : `${base}-${i}${ext}`;
    try {
      await fs.writeFile(candidate, markdown, { encoding: "utf8", flag: "wx" });
      return candidate;
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== "EEXIST") throw err;
    }
  }

  // Extremely unlikely, but keep it bounded.
  const fallback = `${base}-${Date.now()}${ext}`;
  await fs.writeFile(fallback, markdown, { encoding: "utf8", flag: "wx" });
  return fallback;
}

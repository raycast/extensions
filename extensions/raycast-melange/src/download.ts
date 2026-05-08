import { access, mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { homedir } from "node:os";

import { SearchResult, getFastDownloadUrl } from "./annas";

const DEFAULT_DOWNLOAD_DIRECTORY = "~/Downloads/Annas Archive";
const DOWNLOAD_TIMEOUT_MS = 120000;

export type DownloadOptions = {
  secretKey: string;
  downloadDirectory?: string;
};

export async function downloadEpub(result: SearchResult, options: DownloadOptions): Promise<string> {
  const targetDirectory = expandHome(options.downloadDirectory?.trim() || DEFAULT_DOWNLOAD_DIRECTORY);
  await mkdir(targetDirectory, { recursive: true });

  const { downloadUrl } = await getFastDownloadUrl(result.md5, options.secretKey);
  const bytes = await fetchDownloadBytes(downloadUrl);
  if (bytes.length === 0) {
    throw new Error("Downloaded file was empty.");
  }

  const targetPath = await nextAvailablePath(
    join(targetDirectory, `${buildCleanFileBaseName(result)}.epub`),
    result.md5,
  );

  await writeFile(targetPath, bytes);
  return targetPath;
}

async function fetchDownloadBytes(downloadUrl: string): Promise<Buffer> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), DOWNLOAD_TIMEOUT_MS);

  try {
    const response = await fetch(downloadUrl, { signal: controller.signal });

    if (!response.ok) {
      throw new Error(`Download failed with HTTP ${response.status}.`);
    }

    return Buffer.from(await response.arrayBuffer());
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("Download timed out.");
    }

    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

export function getContainingDirectory(filePath: string): string {
  return dirname(filePath);
}

function expandHome(path: string): string {
  if (path === "~") {
    return homedir();
  }

  if (path.startsWith("~/")) {
    return join(homedir(), path.slice(2));
  }

  return path;
}

async function nextAvailablePath(initialPath: string, md5: string): Promise<string> {
  const parsed = splitExtension(initialPath);

  for (let index = 0; index < 100; index += 1) {
    const candidate = index === 0 ? initialPath : `${parsed.base} (${index})${parsed.extension}`;

    if (!(await exists(candidate))) {
      return candidate;
    }
  }

  return `${parsed.base}-${md5}${parsed.extension}`;
}

async function exists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

function splitExtension(path: string): { base: string; extension: string } {
  return path.toLowerCase().endsWith(".epub")
    ? { base: path.slice(0, -5), extension: ".epub" }
    : { base: path, extension: "" };
}

export function buildCleanFileBaseName(result: SearchResult): string {
  const fallback = result.md5;
  const rawName = result.title || fallback;
  const withoutMetadata = rawName
    .replace(/\s+\[[^\]]+\]\s*$/g, "")
    .replace(/\s+\([^)]*(?:epub|retail|z-?lib|anna|archive|converted|calibre)[^)]*\)\s*$/gi, "")
    .replace(/\s+#?\(?v\d+(?:\.\d+)?\)?$/i, "");
  const sanitized = stripTrailingAuthor(withoutMetadata, result.author)
    .replace(/[/:*?"<>|\\]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 160);

  return sanitized || fallback;
}

function stripTrailingAuthor(title: string, author: string | undefined): string {
  if (!author) {
    return title;
  }

  const authorPattern = escapeRegExp(author).replace(/\s+/g, "\\s+");
  return title.replace(new RegExp(`\\s+[-_]+\\s+${authorPattern}\\s*$`, "i"), "").trim();
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
